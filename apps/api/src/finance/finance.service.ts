import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

import type { AuthenticatedUser } from "../auth/authenticated-user";
import { Outlet } from "../outlets/outlet.entity";
import { PaymentStatus } from "../payments/payment.entity";

const COMPLETED_SUB_ORDER_STATUSES = ["COLLECTED", "DISPATCHED"];

@Injectable()
export class FinanceService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Outlet)
    private readonly outlets: Repository<Outlet>,
  ) {}

  async outletSettlements(): Promise<OutletSettlementSummary[]> {
    const rows = await this.dataSource.query<SettlementRow[]>(
      `
        SELECT
          o.id AS "outletId",
          o.name AS "outletName",
          o.image_url AS "imageUrl",
          NULLIF(o.settlement_subaccount_code, '') AS "subaccountCode",
          COUNT(so.id)::int AS "completedSubOrders",
          COUNT(so.id) FILTER (WHERE osa.id IS NULL)::int AS "pendingSubOrders",
          COALESCE(SUM(so.subtotal_minor), 0)::int AS "grossMinor",
          COALESCE(SUM(so.commission_minor), 0)::int AS "commissionMinor",
          COALESCE(SUM(so.net_minor), 0)::int AS "netMinor",
          COALESCE(MAX(so.currency), 'NGN') AS "currency",
          MAX(osa.approved_at) AS "latestApprovedAt"
        FROM outlets o
        LEFT JOIN sub_orders so
          ON so.outlet_id = o.id
         AND so.deleted_at IS NULL
         AND so.status = ANY($1::sub_order_status[])
         AND EXISTS (
           SELECT 1
           FROM payments p
           WHERE p.master_order_id = so.master_order_id
             AND p.status = $2::payment_status
         )
        LEFT JOIN outlet_settlement_approvals osa
          ON osa.sub_order_id = so.id
        WHERE o.deleted_at IS NULL
        GROUP BY o.id, o.name, o.image_url, o.settlement_subaccount_code
        ORDER BY o.name ASC
      `,
      [COMPLETED_SUB_ORDER_STATUSES, PaymentStatus.SUCCESS],
    );

    return rows.map((row) => this.toSettlementSummary(row));
  }

  async approveOutletSettlement(
    outletId: string,
    user: AuthenticatedUser,
  ): Promise<OutletSettlementSummary> {
    const outlet = await this.outlets.findOneBy({ id: outletId });

    if (!outlet) {
      throw new NotFoundException("Outlet not found");
    }

    if (!outlet.settlementSubaccountCode) {
      throw new BadRequestException("Outlet is missing a settlement subaccount code");
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `
          INSERT INTO outlet_settlement_approvals (
            outlet_id,
            sub_order_id,
            approved_by,
            provider,
            provider_reference
          )
          SELECT
            so.outlet_id,
            so.id,
            $1,
            p.gateway,
            p.reference
          FROM sub_orders so
          INNER JOIN payments p
            ON p.master_order_id = so.master_order_id
          LEFT JOIN outlet_settlement_approvals osa
            ON osa.sub_order_id = so.id
          WHERE so.outlet_id = $2
            AND so.deleted_at IS NULL
            AND so.status = ANY($3::sub_order_status[])
            AND p.status = $4::payment_status
            AND osa.id IS NULL
          ON CONFLICT (sub_order_id) DO NOTHING
        `,
        [user.id, outletId, COMPLETED_SUB_ORDER_STATUSES, PaymentStatus.SUCCESS],
      );
    });

    const refreshed = (await this.outletSettlements()).find((row) => row.outletId === outletId);

    return refreshed ?? this.emptyOutletSummary(outlet);
  }

  private toSettlementSummary(row: SettlementRow): OutletSettlementSummary {
    const completedSubOrders = Number(row.completedSubOrders);
    const pendingSubOrders = Number(row.pendingSubOrders);

    return {
      outletId: row.outletId,
      outletName: row.outletName,
      imageUrl: row.imageUrl,
      subaccountCode: row.subaccountCode,
      completedSubOrders,
      pendingSubOrders,
      grossMinor: Number(row.grossMinor),
      commissionMinor: Number(row.commissionMinor),
      netMinor: Number(row.netMinor),
      currency: row.currency,
      status:
        completedSubOrders === 0 ? "NO_ACTIVITY" : pendingSubOrders > 0 ? "PENDING" : "APPROVED",
      latestApprovedAt: row.latestApprovedAt ? new Date(row.latestApprovedAt).toISOString() : null,
    };
  }

  private emptyOutletSummary(outlet: Outlet): OutletSettlementSummary {
    return {
      outletId: outlet.id,
      outletName: outlet.name,
      imageUrl: outlet.imageUrl,
      subaccountCode: outlet.settlementSubaccountCode,
      completedSubOrders: 0,
      pendingSubOrders: 0,
      grossMinor: 0,
      commissionMinor: 0,
      netMinor: 0,
      currency: "NGN",
      status: "NO_ACTIVITY",
      latestApprovedAt: null,
    };
  }
}

interface SettlementRow {
  outletId: string;
  outletName: string;
  imageUrl: string | null;
  subaccountCode: string | null;
  completedSubOrders: number | string;
  pendingSubOrders: number | string;
  grossMinor: number | string;
  commissionMinor: number | string;
  netMinor: number | string;
  currency: "NGN";
  latestApprovedAt: Date | string | null;
}

export interface OutletSettlementSummary {
  outletId: string;
  outletName: string;
  imageUrl: string | null;
  subaccountCode: string | null;
  completedSubOrders: number;
  pendingSubOrders: number;
  grossMinor: number;
  commissionMinor: number;
  netMinor: number;
  currency: "NGN";
  status: "NO_ACTIVITY" | "PENDING" | "APPROVED";
  latestApprovedAt: string | null;
}
