import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

import type { AuthenticatedUser } from "../auth/authenticated-user";
import { Customer } from "../auth/customer.entity";
import { isPlatformAdminRole, UserRole } from "../auth/user-role.enum";
import type { OperationsStatsQueryDto, OrderPulseQueryDto } from "./dto/operations-stats.dto";

interface CountRow {
  count: string;
}

interface QueueRow {
  delayedKitchenTickets: string;
  oldestDelayMinutes: string | null;
  pausedOutlets: string;
}

interface PulseRow {
  bucketStart: Date;
  orderCount: string;
}

const OPEN_MASTER_STATUSES = ["DELIVERED", "CANCELLED"];
const DELAYED_SUB_ORDER_STATUSES = ["PENDING", "ACCEPTED", "PREPARING"];
const COMPLETED_SETTLEMENT_SUB_ORDER_STATUSES = ["COLLECTED", "DISPATCHED"];
const SUCCESSFUL_PAYMENT_STATUS = "SUCCESS";

@Injectable()
export class StatsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Customer)
    private readonly users: Repository<Customer>,
  ) {}

  async operationsSummary(user: AuthenticatedUser, query: OperationsStatsQueryDto) {
    const outletId = await this.resolveOutletScope(user, query.outletId);
    const [activeOutlets, openMasterOrders, delayedSubOrders, pendingSettlements] =
      await Promise.all([
        this.countActiveOutlets(outletId),
        this.countOpenMasterOrders(outletId),
        this.countDelayedSubOrders(outletId),
        this.countPendingSettlements(outletId),
      ]);

    return {
      activeOutlets,
      openMasterOrders,
      delayedSubOrders,
      pendingSettlements,
    };
  }

  async orderPulse(user: AuthenticatedUser, query: OrderPulseQueryDto) {
    const outletId = await this.resolveOutletScope(user, query.outletId);
    const range = query.range ?? "TODAY";
    const config = pulseConfig(range);
    const params: unknown[] = [OPEN_MASTER_STATUSES];
    const outletFilter = outletId
      ? `AND EXISTS (
          SELECT 1
          FROM sub_orders scoped_sub_orders
          WHERE scoped_sub_orders.master_order_id = master_orders.id
            AND scoped_sub_orders.outlet_id = $${params.push(outletId)}
            AND scoped_sub_orders.deleted_at IS NULL
        )`
      : "";

    const rows = await this.dataSource.query<PulseRow[]>(
      `
        WITH buckets AS (
          SELECT generate_series(
            ${config.startExpression},
            ${config.endExpression},
            ${config.stepExpression}
          ) AS bucket_start
        ),
        order_counts AS (
          SELECT
            date_trunc('${config.truncUnit}', master_orders.created_at) AS bucket_start,
            COUNT(*)::integer AS order_count
          FROM master_orders
          WHERE master_orders.deleted_at IS NULL
            AND master_orders.created_at >= ${config.startExpression}
            AND master_orders.created_at <= now()
            AND master_orders.status <> ALL($1::master_order_status[])
            ${outletFilter}
          GROUP BY 1
        )
        SELECT
          buckets.bucket_start AS "bucketStart",
          COALESCE(order_counts.order_count, 0)::integer AS "orderCount"
        FROM buckets
        LEFT JOIN order_counts ON order_counts.bucket_start = buckets.bucket_start
        ORDER BY buckets.bucket_start ASC
      `,
      params,
    );

    return {
      range,
      outletId,
      points: rows.map((row) => ({
        bucketStart: row.bucketStart,
        label: formatPulseLabel(row.bucketStart, range),
        orderCount: Number(row.orderCount),
      })),
    };
  }

  async operationsQueue(user: AuthenticatedUser, query: OperationsStatsQueryDto) {
    const outletId = await this.resolveOutletScope(user, query.outletId);
    const params: unknown[] = [DELAYED_SUB_ORDER_STATUSES];
    const outletFilter = outletId ? `AND sub_orders.outlet_id = $${params.push(outletId)}` : "";
    const outletWhere = outletId ? `AND outlets.id = $${params.push(outletId)}` : "";
    const [row] = await this.dataSource.query<QueueRow[]>(
      `
        SELECT
          (
            SELECT COUNT(*)::integer
            FROM sub_orders
            WHERE sub_orders.deleted_at IS NULL
              AND sub_orders.status = ANY($1::sub_order_status[])
              AND sub_orders.updated_at <= now() - INTERVAL '15 minutes'
              ${outletFilter}
          ) AS "delayedKitchenTickets",
          (
            SELECT FLOOR(EXTRACT(EPOCH FROM (now() - MIN(sub_orders.updated_at))) / 60)::integer
            FROM sub_orders
            WHERE sub_orders.deleted_at IS NULL
              AND sub_orders.status = ANY($1::sub_order_status[])
              AND sub_orders.updated_at <= now() - INTERVAL '15 minutes'
              ${outletFilter}
          ) AS "oldestDelayMinutes",
          (
            SELECT COUNT(*)::integer
            FROM outlets
            WHERE outlets.deleted_at IS NULL
              AND outlets.is_online = false
              ${outletWhere}
          ) AS "pausedOutlets"
      `,
      params,
    );

    return {
      outletId,
      delayedKitchenTickets: Number(row?.delayedKitchenTickets ?? 0),
      oldestDelayMinutes:
        row?.oldestDelayMinutes === null ? null : Number(row?.oldestDelayMinutes ?? 0),
      pausedOutlets: Number(row?.pausedOutlets ?? 0),
      items: [
        {
          type: "DELAYED_KITCHEN_TICKETS",
          count: Number(row?.delayedKitchenTickets ?? 0),
          oldestDelayMinutes:
            row?.oldestDelayMinutes === null ? null : Number(row?.oldestDelayMinutes ?? 0),
        },
        {
          type: "PAUSED_OUTLETS",
          count: Number(row?.pausedOutlets ?? 0),
        },
      ],
    };
  }

  private async countActiveOutlets(outletId: string | null): Promise<number> {
    const params: unknown[] = [];
    const outletFilter = outletId ? `AND id = $${params.push(outletId)}` : "";
    const [row] = await this.dataSource.query<CountRow[]>(
      `
        SELECT COUNT(*)::integer AS count
        FROM outlets
        WHERE deleted_at IS NULL
          AND is_online = true
          ${outletFilter}
      `,
      params,
    );

    return Number(row?.count ?? 0);
  }

  private async countOpenMasterOrders(outletId: string | null): Promise<number> {
    const params: unknown[] = [OPEN_MASTER_STATUSES];
    const outletFilter = outletId
      ? `AND EXISTS (
          SELECT 1
          FROM sub_orders
          WHERE sub_orders.master_order_id = master_orders.id
            AND sub_orders.outlet_id = $${params.push(outletId)}
            AND sub_orders.deleted_at IS NULL
        )`
      : "";
    const [row] = await this.dataSource.query<CountRow[]>(
      `
        SELECT COUNT(*)::integer AS count
        FROM master_orders
        WHERE deleted_at IS NULL
          AND status <> ALL($1::master_order_status[])
          ${outletFilter}
      `,
      params,
    );

    return Number(row?.count ?? 0);
  }

  private async countDelayedSubOrders(outletId: string | null): Promise<number> {
    const params: unknown[] = [DELAYED_SUB_ORDER_STATUSES];
    const outletFilter = outletId ? `AND outlet_id = $${params.push(outletId)}` : "";
    const [row] = await this.dataSource.query<CountRow[]>(
      `
        SELECT COUNT(*)::integer AS count
        FROM sub_orders
        WHERE deleted_at IS NULL
          AND status = ANY($1::sub_order_status[])
          AND updated_at <= now() - INTERVAL '15 minutes'
          ${outletFilter}
      `,
      params,
    );

    return Number(row?.count ?? 0);
  }

  private async countPendingSettlements(outletId: string | null): Promise<number> {
    const params: unknown[] = [COMPLETED_SETTLEMENT_SUB_ORDER_STATUSES, SUCCESSFUL_PAYMENT_STATUS];
    const outletFilter = outletId ? `AND sub_orders.outlet_id = $${params.push(outletId)}` : "";
    const [row] = await this.dataSource.query<CountRow[]>(
      `
        SELECT COUNT(*)::integer AS count
        FROM sub_orders
        LEFT JOIN outlet_settlement_approvals
          ON outlet_settlement_approvals.sub_order_id = sub_orders.id
        WHERE sub_orders.deleted_at IS NULL
          AND sub_orders.status = ANY($1::sub_order_status[])
          AND outlet_settlement_approvals.id IS NULL
          AND EXISTS (
            SELECT 1
            FROM payments
            WHERE payments.master_order_id = sub_orders.master_order_id
              AND payments.status = $2::payment_status
          )
          ${outletFilter}
      `,
      params,
    );

    return Number(row?.count ?? 0);
  }

  private async resolveOutletScope(
    user: AuthenticatedUser,
    requestedOutletId: string | undefined,
  ): Promise<string | null> {
    if (isPlatformAdminRole(user.role)) {
      return requestedOutletId ?? null;
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Operations stats require admin access");
    }

    const admin = await this.users.findOne({
      where: { id: user.id, role: UserRole.ADMIN },
      select: { id: true, outletId: true },
    });

    if (!admin?.outletId) {
      throw new ForbiddenException("Outlet admin is not linked to an outlet");
    }

    if (requestedOutletId && requestedOutletId !== admin.outletId) {
      throw new ForbiddenException("Cannot view another outlet's stats");
    }

    return admin.outletId;
  }
}

function pulseConfig(range: "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS") {
  if (range === "LAST_7_DAYS") {
    return {
      startExpression: "date_trunc('day', now()) - INTERVAL '6 days'",
      endExpression: "date_trunc('day', now())",
      stepExpression: "INTERVAL '1 day'",
      truncUnit: "day",
    };
  }

  if (range === "LAST_30_DAYS") {
    return {
      startExpression: "date_trunc('day', now()) - INTERVAL '29 days'",
      endExpression: "date_trunc('day', now())",
      stepExpression: "INTERVAL '1 day'",
      truncUnit: "day",
    };
  }

  return {
    startExpression: "date_trunc('day', now())",
    endExpression: "date_trunc('hour', now())",
    stepExpression: "INTERVAL '1 hour'",
    truncUnit: "hour",
  };
}

function formatPulseLabel(date: Date, range: "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS"): string {
  if (range === "TODAY") {
    return new Intl.DateTimeFormat("en", { hour: "numeric", hour12: true }).format(date);
  }

  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}
