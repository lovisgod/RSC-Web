import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

import type { AuthenticatedUser } from "../auth/authenticated-user";
import { Customer } from "../auth/customer.entity";
import { CustomerStatus } from "../auth/customer-status.enum";
import { UserRole } from "../auth/user-role.enum";
import { MasterOrderStatus } from "../orders/order-status.enum";
import { RealtimeService } from "../realtime/realtime.service";
import type { UpdateRiderAvailabilityDto } from "./dto/rider-availability.dto";
import type { RecordRiderLocationDto, RiderDeliveriesQueryDto } from "./dto/rider-location.dto";
import { RiderLocation } from "./rider-location.entity";

const RIDER_STATUS_AVAILABLE = "AVAILABLE";
const RIDER_STATUS_UNAVAILABLE = "UNAVAILABLE";

export interface RiderAvailabilityResult {
  id: string;
  outletId: string | null;
  riderStatus: string;
  isAvailable: boolean;
}

@Injectable()
export class RidersService {
  constructor(
    @InjectRepository(Customer)
    private readonly users: Repository<Customer>,
    @InjectRepository(RiderLocation)
    private readonly locations: Repository<RiderLocation>,
    private readonly dataSource: DataSource,
    private readonly realtime: RealtimeService,
  ) {}

  async recordLocation(
    user: AuthenticatedUser,
    input: RecordRiderLocationDto,
  ): Promise<RiderLocation> {
    if (user.role !== UserRole.RIDER) {
      throw new ForbiddenException("Only riders can record rider locations");
    }

    await this.ensureActiveRider(user.id);

    const masterOrderId = input.masterOrderId ?? (await this.findCurrentTrackableOrderId(user.id));

    if (masterOrderId) {
      await this.ensureCanRecordOrderLocation(user.id, masterOrderId);
    }

    const rows = await this.dataSource.query<RiderLocation[]>(
      `
        INSERT INTO rider_locations (rider_id, master_order_id, geom)
        VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326))
        RETURNING id, rider_id AS "riderId", master_order_id AS "masterOrderId", ST_AsText(geom) AS geom, recorded_at AS "recordedAt"
      `,
      [user.id, masterOrderId, input.longitude, input.latitude],
    );

    const location = rows[0]!;

    this.realtime.emitRiderLocationUpdate({
      riderId: location.riderId,
      masterOrderId: location.masterOrderId,
      latitude: input.latitude,
      longitude: input.longitude,
      recordedAt: location.recordedAt,
    });

    return location;
  }

  private async findCurrentTrackableOrderId(riderId: string): Promise<string | null> {
    const rows = await this.dataSource.query<Array<{ id: string }>>(
      `
        SELECT id
        FROM master_orders
        WHERE rider_id = $1
          AND delivery_mode = 'DELIVERY'
          AND status = $2
          AND deleted_at IS NULL
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      [riderId, MasterOrderStatus.OUT_FOR_DELIVERY],
    );

    return rows[0]?.id ?? null;
  }

  private async ensureActiveRider(riderId: string): Promise<void> {
    const rider = await this.users.findOne({
      where: { id: riderId, role: UserRole.RIDER },
      select: { id: true, status: true },
    });

    if (!rider || rider.status !== CustomerStatus.ACTIVE) {
      throw new UnauthorizedException("Rider account is no longer active");
    }
  }

  private async ensureCanRecordOrderLocation(
    riderId: string,
    masterOrderId: string,
  ): Promise<void> {
    const rows = await this.dataSource.query<Array<{ riderId: string | null }>>(
      `
        SELECT rider_id AS "riderId"
        FROM master_orders
        WHERE id = $1
        LIMIT 1
      `,
      [masterOrderId],
    );
    const order = rows[0];

    if (!order) {
      throw new ForbiddenException("Cannot record location for an unknown order");
    }

    if (order.riderId && order.riderId !== riderId) {
      throw new ForbiddenException("Cannot record location for another rider's order");
    }
  }

  listMine(user: AuthenticatedUser): Promise<RiderLocation[]> {
    if (user.role !== UserRole.RIDER) {
      throw new ForbiddenException("Only riders can view rider locations");
    }

    return this.locations.find({
      where: { riderId: user.id },
      order: { recordedAt: "DESC" },
      take: 100,
    });
  }

  async updateAvailability(
    user: AuthenticatedUser,
    input: UpdateRiderAvailabilityDto,
  ): Promise<RiderAvailabilityResult> {
    if (user.role !== UserRole.RIDER) {
      throw new ForbiddenException("Only riders can update rider availability");
    }

    const rider = await this.users.findOne({
      where: { id: user.id, role: UserRole.RIDER },
      select: { id: true, outletId: true, status: true, riderStatus: true, updatedAt: true },
    });

    if (!rider || rider.status !== CustomerStatus.ACTIVE) {
      throw new UnauthorizedException("Rider account is no longer active");
    }

    rider.riderStatus = input.isAvailable ? RIDER_STATUS_AVAILABLE : RIDER_STATUS_UNAVAILABLE;
    const saved = await this.users.save(rider);
    const isAvailable = saved.riderStatus === RIDER_STATUS_AVAILABLE;

    this.realtime.emitRiderAvailabilityUpdate({
      riderId: saved.id,
      outletId: saved.outletId,
      riderStatus: saved.riderStatus ?? RIDER_STATUS_UNAVAILABLE,
      isAvailable,
      updatedAt: saved.updatedAt,
    });

    return {
      id: saved.id,
      outletId: saved.outletId,
      riderStatus: saved.riderStatus ?? RIDER_STATUS_UNAVAILABLE,
      isAvailable,
    };
  }

  async completedDeliveries(user: AuthenticatedUser, query: RiderDeliveriesQueryDto) {
    if (user.role !== UserRole.RIDER) {
      throw new ForbiddenException("Only riders can view completed deliveries");
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const filters = [`mo.rider_id = $1`, `mo.status = $2`];
    const params: unknown[] = [user.id, MasterOrderStatus.DELIVERED];

    if (query.from) {
      params.push(query.from);
      filters.push(`mo.updated_at >= $${params.length}`);
    }

    if (query.to) {
      params.push(query.to);
      filters.push(`mo.updated_at <= $${params.length}`);
    }

    if (query.deliveryMode) {
      params.push(query.deliveryMode);
      filters.push(`mo.delivery_mode = $${params.length}`);
    }

    if (query.payoutStatus) {
      params.push(query.payoutStatus);
      filters.push(`COALESCE(p.status::text, 'PENDING') = $${params.length}`);
    }

    const where = filters.join(" AND ");
    const rows = await this.dataSource.query<CompletedDeliveryRow[]>(
      `
        SELECT
          mo.id AS "masterOrderId",
          mo.delivery_mode AS "deliveryMode",
          mo.delivery_fee_minor AS "earnedMinor",
          mo.currency AS "currency",
          mo.updated_at AS "completedAt",
          COALESCE(p.status::text, 'PENDING') AS "payoutStatus",
          COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'subOrderId', so.id,
                'outletId', so.outlet_id,
                'subtotalMinor', so.subtotal_minor,
                'netMinor', so.net_minor,
                'commissionMinor', so.commission_minor
              )
              ORDER BY so.created_at ASC
            ) FILTER (WHERE so.id IS NOT NULL),
            '[]'::jsonb
          ) AS "subOrders"
        FROM master_orders mo
        LEFT JOIN payments p ON p.master_order_id = mo.id
        LEFT JOIN sub_orders so ON so.master_order_id = mo.id
        WHERE ${where}
        GROUP BY mo.id, p.status
        ORDER BY mo.updated_at DESC
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
      `,
      [...params, limit, offset],
    );
    const [summary] = await this.dataSource.query<
      Array<{ total: string; totalEarnedMinor: string | null }>
    >(
      `
        SELECT
          COUNT(DISTINCT mo.id)::text AS "total",
          COALESCE(SUM(DISTINCT mo.delivery_fee_minor), 0)::text AS "totalEarnedMinor"
        FROM master_orders mo
        LEFT JOIN payments p ON p.master_order_id = mo.id
        WHERE ${where}
      `,
      params,
    );

    return {
      page,
      limit,
      total: Number(summary?.total ?? 0),
      totalEarnedMinor: Number(summary?.totalEarnedMinor ?? 0),
      currency: "NGN" as const,
      deliveries: rows.map((row) => ({
        ...row,
        earnedMinor: Number(row.earnedMinor),
        completedAt: new Date(row.completedAt).toISOString(),
      })),
    };
  }
}

interface CompletedDeliveryRow {
  masterOrderId: string;
  deliveryMode: "DELIVERY" | "TAKEOUT";
  earnedMinor: number | string;
  currency: "NGN";
  completedAt: Date | string;
  payoutStatus: string;
  subOrders: Array<{
    subOrderId: string;
    outletId: string;
    subtotalMinor: number;
    netMinor: number;
    commissionMinor: number;
  }>;
}
