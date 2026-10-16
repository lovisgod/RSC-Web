import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

import type { AuthenticatedUser } from "../auth/authenticated-user";
import { Outlet } from "../outlets/outlet.entity";
import { PaymentStatus } from "../payments/payment.entity";

const COMPLETED_SUB_ORDER_STATUSES = ["COLLECTED", "DISPATCHED"];
const SETTLEMENT_TIME_ZONE = "Africa/Lagos";

export interface OutletSettlementQuery {
  dateFrom?: string;
  dateTo?: string;
  outletId?: string;
}

@Injectable()
export class FinanceService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Outlet)
    private readonly outlets: Repository<Outlet>,
  ) {}

  async outletSettlements(query: OutletSettlementQuery = {}): Promise<OutletSettlementSummary[]> {
    const window = this.normalizeSettlementWindow(query);
    const rows = await this.dataSource.query<SettlementRow[]>(
      `
        WITH successful_payments AS (
          SELECT DISTINCT ON (payment.master_order_id)
            payment.id,
            payment.master_order_id,
            payment.amount_minor
          FROM payments payment
          WHERE payment.status = $2::payment_status
            AND (payment.succeeded_at AT TIME ZONE $3)::date BETWEEN $4::date AND $5::date
          ORDER BY payment.master_order_id, payment.succeeded_at DESC, payment.id DESC
        ),
        allocation_base AS (
          SELECT
            so.*,
            payment.id AS payment_id,
            payment.amount_minor AS payment_amount_minor,
            SUM(so.net_minor) OVER (PARTITION BY so.master_order_id)::int AS outlet_total_minor,
            ROW_NUMBER() OVER (PARTITION BY so.master_order_id ORDER BY so.id) AS allocation_rank,
            COUNT(*) OVER (PARTITION BY so.master_order_id) AS allocation_count
          FROM sub_orders so
          INNER JOIN successful_payments payment
            ON payment.master_order_id = so.master_order_id
          WHERE so.deleted_at IS NULL
        ),
        allocated_sub_orders AS (
          SELECT
            allocation_base.*,
            CASE
              WHEN outlet_total_minor <= 0 THEN 0
              ELSE FLOOR(
                GREATEST(payment_amount_minor - outlet_total_minor, 0)::numeric
                * net_minor::numeric / outlet_total_minor::numeric
              )::int
            END AS base_dineout_minor
          FROM allocation_base
        ),
        paid_sub_orders AS (
          SELECT
            allocated_sub_orders.*,
            CASE
              WHEN allocation_rank = allocation_count THEN
                GREATEST(payment_amount_minor - outlet_total_minor, 0)
                - SUM(base_dineout_minor) OVER (PARTITION BY master_order_id)
                + base_dineout_minor
              ELSE base_dineout_minor
            END::int AS dineout_gross_minor
          FROM allocated_sub_orders
        )
        SELECT
          o.id AS "outletId",
          o.name AS "outletName",
          o.image_url AS "imageUrl",
          NULLIF(o.settlement_subaccount_code, '') AS "subaccountCode",
          COUNT(so.id)::int AS "completedSubOrders",
          COUNT(so.id) FILTER (WHERE osa.id IS NULL)::int AS "pendingSubOrders",
          COUNT(so.id) FILTER (
            WHERE NOT (so.status = ANY($1::sub_order_status[]))
          )::int AS "fulfillmentPendingSubOrders",
          COALESCE(SUM(so.net_minor), 0)::int AS "grossMinor",
          COALESCE(SUM(so.dineout_gross_minor), 0)::int AS "dineoutGrossMinor",
          COALESCE(SUM(so.net_minor + so.dineout_gross_minor), 0)::int AS "totalCollectedMinor",
          COALESCE(SUM(so.commission_minor), 0)::int AS "commissionMinor",
          COALESCE(SUM(so.net_minor), 0)::int AS "netMinor",
          COALESCE(MAX(so.currency), 'NGN') AS "currency",
          MAX(osa.approved_at) AS "latestApprovedAt"
        FROM outlets o
        LEFT JOIN paid_sub_orders so
          ON so.outlet_id = o.id
        LEFT JOIN outlet_settlement_approvals osa
          ON osa.sub_order_id = so.id
        WHERE o.deleted_at IS NULL
          AND ($6::uuid IS NULL OR o.id = $6::uuid)
        GROUP BY o.id, o.name, o.image_url, o.settlement_subaccount_code
        ORDER BY o.name ASC
      `,
      [
        COMPLETED_SUB_ORDER_STATUSES,
        PaymentStatus.SUCCESS,
        SETTLEMENT_TIME_ZONE,
        window.dateFrom,
        window.dateTo,
        query.outletId ?? null,
      ],
    );

    return rows.map((row) => this.toSettlementSummary(row, window));
  }

  async approveOutletSettlement(
    outletId: string,
    user: AuthenticatedUser,
    query: OutletSettlementQuery = {},
  ): Promise<OutletSettlementSummary> {
    const window = this.normalizeSettlementWindow(query);
    const outlet = await this.outlets.findOneBy({ id: outletId });

    if (!outlet) {
      throw new NotFoundException("Outlet not found");
    }

    if (!outlet.settlementSubaccountCode) {
      throw new BadRequestException("Outlet is missing a settlement subaccount code");
    }

    this.assertApprovalWindowIsClosed(window);

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
          INNER JOIN LATERAL (
            SELECT payment.gateway, payment.reference
            FROM payments payment
            WHERE payment.master_order_id = so.master_order_id
              AND payment.status = $3::payment_status
              AND (payment.succeeded_at AT TIME ZONE $4)::date BETWEEN $5::date AND $6::date
            ORDER BY payment.succeeded_at DESC, payment.id DESC
            LIMIT 1
          ) p ON TRUE
          LEFT JOIN outlet_settlement_approvals osa
            ON osa.sub_order_id = so.id
          WHERE so.outlet_id = $2
            AND so.deleted_at IS NULL
            AND osa.id IS NULL
          ON CONFLICT (sub_order_id) DO NOTHING
        `,
        [
          user.id,
          outletId,
          PaymentStatus.SUCCESS,
          SETTLEMENT_TIME_ZONE,
          window.dateFrom,
          window.dateTo,
        ],
      );
    });

    const refreshed = (await this.outletSettlements({ ...window, outletId })).find(
      (row) => row.outletId === outletId,
    );

    return refreshed ?? this.emptyOutletSummary(outlet, window);
  }

  async exportOutletSettlements(
    query: OutletSettlementQuery = {},
  ): Promise<OutletSettlementExport> {
    const window = this.normalizeSettlementWindow(query);
    if (query.outletId && !(await this.outlets.existsBy({ id: query.outletId }))) {
      throw new NotFoundException("Outlet not found");
    }

    const rows = await this.dataSource.query<SettlementExportRow[]>(
      `
        WITH successful_payments AS (
          SELECT DISTINCT ON (payment.master_order_id)
            payment.id,
            payment.master_order_id,
            payment.amount_minor,
            payment.reference,
            payment.gateway,
            payment.succeeded_at
          FROM payments payment
          WHERE payment.status = $2::payment_status
            AND (payment.succeeded_at AT TIME ZONE $3)::date BETWEEN $4::date AND $5::date
          ORDER BY payment.master_order_id, payment.succeeded_at DESC, payment.id DESC
        ),
        allocation_base AS (
          SELECT
            so.*,
            payment.amount_minor AS payment_amount_minor,
            payment.reference AS payment_reference,
            payment.gateway AS payment_gateway,
            payment.succeeded_at AS payment_succeeded_at,
            SUM(so.net_minor) OVER (PARTITION BY so.master_order_id)::int AS outlet_total_minor,
            ROW_NUMBER() OVER (PARTITION BY so.master_order_id ORDER BY so.id) AS allocation_rank,
            COUNT(*) OVER (PARTITION BY so.master_order_id) AS allocation_count
          FROM sub_orders so
          INNER JOIN successful_payments payment
            ON payment.master_order_id = so.master_order_id
          WHERE so.deleted_at IS NULL
        ),
        allocated_sub_orders AS (
          SELECT
            allocation_base.*,
            CASE
              WHEN outlet_total_minor <= 0 THEN 0
              ELSE FLOOR(
                GREATEST(payment_amount_minor - outlet_total_minor, 0)::numeric
                * net_minor::numeric / outlet_total_minor::numeric
              )::int
            END AS base_dineout_minor
          FROM allocation_base
        ),
        paid_sub_orders AS (
          SELECT
            allocated_sub_orders.*,
            CASE
              WHEN allocation_rank = allocation_count THEN
                GREATEST(payment_amount_minor - outlet_total_minor, 0)
                - SUM(base_dineout_minor) OVER (PARTITION BY master_order_id)
                + base_dineout_minor
              ELSE base_dineout_minor
            END::int AS dineout_gross_minor
          FROM allocated_sub_orders
        )
        SELECT
          (so.payment_succeeded_at AT TIME ZONE $3)::date::text AS "settlementDate",
          o.id AS "outletId",
          o.name AS "outletName",
          NULLIF(o.settlement_subaccount_code, '') AS "subaccountCode",
          so.id AS "subOrderId",
          so.master_order_id AS "masterOrderId",
          so.payment_reference AS "paymentReference",
          so.payment_gateway AS "paymentGateway",
          so.payment_succeeded_at AS "completedAt",
          so.net_minor AS "grossMinor",
          so.dineout_gross_minor AS "dineoutGrossMinor",
          (so.net_minor + so.dineout_gross_minor) AS "totalCollectedMinor",
          so.commission_minor AS "commissionMinor",
          so.net_minor AS "netMinor",
          so.currency AS "currency",
          CASE
            WHEN osa.id IS NOT NULL THEN 'APPROVED'
            WHEN NOT (so.status = ANY($1::sub_order_status[])) THEN 'AWAITING_FULFILLMENT'
            ELSE 'PENDING'
          END AS "payoutStatus",
          osa.approved_at AS "approvedAt"
        FROM paid_sub_orders so
        INNER JOIN outlets o
          ON o.id = so.outlet_id
         AND o.deleted_at IS NULL
        LEFT JOIN outlet_settlement_approvals osa
          ON osa.sub_order_id = so.id
        WHERE ($6::uuid IS NULL OR so.outlet_id = $6::uuid)
        ORDER BY so.payment_succeeded_at ASC, o.name ASC, so.id ASC
      `,
      [
        COMPLETED_SUB_ORDER_STATUSES,
        PaymentStatus.SUCCESS,
        SETTLEMENT_TIME_ZONE,
        window.dateFrom,
        window.dateTo,
        query.outletId ?? null,
      ],
    );

    return {
      filename: `rsc-outlet-settlements-${window.dateFrom}-to-${window.dateTo}.csv`,
      contentType: "text/csv; charset=utf-8",
      content: settlementRowsToCsv(rows),
    };
  }

  private toSettlementSummary(
    row: SettlementRow,
    window: Required<Pick<OutletSettlementQuery, "dateFrom" | "dateTo">>,
  ): OutletSettlementSummary {
    const completedSubOrders = Number(row.completedSubOrders);
    const pendingSubOrders = Number(row.pendingSubOrders);
    const fulfillmentPendingSubOrders = Number(row.fulfillmentPendingSubOrders);
    const approvalWindowOpen = this.isApprovalWindowOpen(window);
    const hasSubaccount = !!row.subaccountCode;
    const approvalAvailable =
      !approvalWindowOpen && pendingSubOrders > 0 && completedSubOrders > 0 && hasSubaccount;

    return {
      outletId: row.outletId,
      outletName: row.outletName,
      imageUrl: row.imageUrl,
      subaccountCode: row.subaccountCode,
      settlementDateFrom: window.dateFrom,
      settlementDateTo: window.dateTo,
      completedSubOrders,
      pendingSubOrders,
      fulfillmentPendingSubOrders,
      grossMinor: Number(row.grossMinor),
      dineoutGrossMinor: Number(row.dineoutGrossMinor),
      totalCollectedMinor: Number(row.totalCollectedMinor),
      commissionMinor: Number(row.commissionMinor),
      netMinor: Number(row.netMinor),
      currency: row.currency,
      status:
        completedSubOrders === 0 ? "NO_ACTIVITY" : pendingSubOrders > 0 ? "PENDING" : "APPROVED",
      approvalAvailable,
      approvalUnavailableReason: this.approvalUnavailableReason({
        approvalWindowOpen,
        completedSubOrders,
        pendingSubOrders,
        hasSubaccount,
      }),
      latestApprovedAt: row.latestApprovedAt ? new Date(row.latestApprovedAt).toISOString() : null,
    };
  }

  private emptyOutletSummary(
    outlet: Outlet,
    window: Required<Pick<OutletSettlementQuery, "dateFrom" | "dateTo">>,
  ): OutletSettlementSummary {
    return {
      outletId: outlet.id,
      outletName: outlet.name,
      imageUrl: outlet.imageUrl,
      subaccountCode: outlet.settlementSubaccountCode,
      settlementDateFrom: window.dateFrom,
      settlementDateTo: window.dateTo,
      completedSubOrders: 0,
      pendingSubOrders: 0,
      fulfillmentPendingSubOrders: 0,
      grossMinor: 0,
      dineoutGrossMinor: 0,
      totalCollectedMinor: 0,
      commissionMinor: 0,
      netMinor: 0,
      currency: "NGN",
      status: "NO_ACTIVITY",
      approvalAvailable: false,
      approvalUnavailableReason: "No successful payments in this settlement window",
      latestApprovedAt: null,
    };
  }

  private normalizeSettlementWindow(
    query: OutletSettlementQuery,
  ): Required<Pick<OutletSettlementQuery, "dateFrom" | "dateTo">> {
    const defaultDate = lagosDateString(-1);
    const dateFrom = query.dateFrom?.trim() || defaultDate;
    const dateTo = query.dateTo?.trim() || dateFrom;

    if (!isIsoDate(dateFrom) || !isIsoDate(dateTo)) {
      throw new BadRequestException("Settlement dates must use YYYY-MM-DD format");
    }

    if (dateFrom > dateTo) {
      throw new BadRequestException("Settlement start date cannot be after end date");
    }

    return { dateFrom, dateTo };
  }

  private assertApprovalWindowIsClosed(
    window: Required<Pick<OutletSettlementQuery, "dateFrom" | "dateTo">>,
  ): void {
    if (this.isApprovalWindowOpen(window)) {
      throw new BadRequestException("Settlement can only be approved from the next business day");
    }
  }

  private isApprovalWindowOpen(
    window: Required<Pick<OutletSettlementQuery, "dateFrom" | "dateTo">>,
  ): boolean {
    return window.dateTo >= lagosDateString(0);
  }

  private approvalUnavailableReason(input: {
    approvalWindowOpen: boolean;
    completedSubOrders: number;
    pendingSubOrders: number;
    hasSubaccount: boolean;
  }): string | null {
    if (input.approvalWindowOpen) {
      return "Settlement can only be approved from the next business day";
    }
    if (!input.hasSubaccount) {
      return "Outlet is missing a settlement subaccount code";
    }
    if (input.completedSubOrders === 0) {
      return "No successful payments in this settlement window";
    }
    if (input.pendingSubOrders === 0) {
      return "Settlement window is already approved";
    }

    return null;
  }
}

interface SettlementRow {
  outletId: string;
  outletName: string;
  imageUrl: string | null;
  subaccountCode: string | null;
  completedSubOrders: number | string;
  pendingSubOrders: number | string;
  fulfillmentPendingSubOrders: number | string;
  grossMinor: number | string;
  dineoutGrossMinor: number | string;
  totalCollectedMinor: number | string;
  commissionMinor: number | string;
  netMinor: number | string;
  currency: "NGN";
  latestApprovedAt: Date | string | null;
}

interface SettlementExportRow {
  settlementDate: string;
  outletId: string;
  outletName: string;
  subaccountCode: string | null;
  subOrderId: string;
  masterOrderId: string;
  paymentReference: string;
  paymentGateway: string;
  completedAt: Date | string;
  grossMinor: number | string;
  dineoutGrossMinor: number | string;
  totalCollectedMinor: number | string;
  commissionMinor: number | string;
  netMinor: number | string;
  currency: "NGN";
  payoutStatus: "AWAITING_FULFILLMENT" | "PENDING" | "APPROVED";
  approvedAt: Date | string | null;
}

export interface OutletSettlementSummary {
  outletId: string;
  outletName: string;
  imageUrl: string | null;
  subaccountCode: string | null;
  settlementDateFrom: string;
  settlementDateTo: string;
  completedSubOrders: number;
  pendingSubOrders: number;
  fulfillmentPendingSubOrders: number;
  grossMinor: number;
  dineoutGrossMinor: number;
  totalCollectedMinor: number;
  commissionMinor: number;
  netMinor: number;
  currency: "NGN";
  status: "NO_ACTIVITY" | "PENDING" | "APPROVED";
  approvalAvailable: boolean;
  approvalUnavailableReason: string | null;
  latestApprovedAt: string | null;
}

export interface OutletSettlementExport {
  filename: string;
  contentType: string;
  content: string;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function lagosDateString(offsetDays: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SETTLEMENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const date = new Date(Date.UTC(year, month - 1, day + offsetDays));

  return date.toISOString().slice(0, 10);
}

const SETTLEMENT_EXPORT_HEADERS = [
  "settlement_date",
  "outlet_id",
  "outlet_name",
  "settlement_subaccount_code",
  "sub_order_id",
  "master_order_id",
  "payment_reference",
  "payment_gateway",
  "completed_at",
  "gross_minor",
  "dineout_gross_minor",
  "total_collected_minor",
  "commission_minor",
  "net_minor",
  "currency",
  "payout_status",
  "approved_at",
] as const;

export function settlementRowsToCsv(rows: SettlementExportRow[]): string {
  const lines = rows.map((row) =>
    [
      row.settlementDate,
      row.outletId,
      row.outletName,
      row.subaccountCode ?? "",
      row.subOrderId,
      row.masterOrderId,
      row.paymentReference,
      row.paymentGateway,
      new Date(row.completedAt).toISOString(),
      Number(row.grossMinor),
      Number(row.dineoutGrossMinor),
      Number(row.totalCollectedMinor),
      Number(row.commissionMinor),
      Number(row.netMinor),
      row.currency,
      row.payoutStatus,
      row.approvedAt ? new Date(row.approvedAt).toISOString() : "",
    ].map(escapeCsvCell),
  );

  if (rows.length > 0) {
    const totalGross = rows.reduce((sum, r) => sum + Number(r.grossMinor), 0);
    const totalDineoutGross = rows.reduce((sum, r) => sum + Number(r.dineoutGrossMinor), 0);
    const totalCollected = rows.reduce((sum, r) => sum + Number(r.totalCollectedMinor), 0);
    const totalCommission = rows.reduce((sum, r) => sum + Number(r.commissionMinor), 0);
    const totalNet = rows.reduce((sum, r) => sum + Number(r.netMinor), 0);
    const currency = rows[0]?.currency ?? "NGN";

    lines.push(
      [
        "**Grand Total**",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        `**${totalGross}**`,
        `**${totalDineoutGross}**`,
        `**${totalCollected}**`,
        `**${totalCommission}**`,
        `**${totalNet}**`,
        `**${currency}**`,
        "",
        "",
      ].map(escapeCsvCell),
    );
  }

  return [SETTLEMENT_EXPORT_HEADERS.join(","), ...lines.map((line) => line.join(","))].join("\n");
}

function escapeCsvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
