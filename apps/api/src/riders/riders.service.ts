import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

import type { AuthenticatedUser } from "../auth/authenticated-user";
import { UserRole } from "../auth/user-role.enum";
import { MasterOrderStatus } from "../orders/order-status.enum";
import { RealtimeService } from "../realtime/realtime.service";
import type { RecordRiderLocationDto, RiderDeliveriesQueryDto } from "./dto/rider-location.dto";
import { RiderLocation } from "./rider-location.entity";

@Injectable()
export class RidersService {
  constructor(
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

    const rows = await this.dataSource.query<RiderLocation[]>(
      `
        INSERT INTO rider_locations (rider_id, master_order_id, geom)
        VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326))
        RETURNING id, rider_id AS "riderId", master_order_id AS "masterOrderId", ST_AsText(geom) AS geom, recorded_at AS "recordedAt"
      `,
      [user.id, input.masterOrderId ?? null, input.longitude, input.latitude],
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
