import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

import type { AuthenticatedUser } from "../auth/authenticated-user";
import type { ApplicationConfig } from "../config/configuration";
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
    private readonly configService: ConfigService<ApplicationConfig, true>,
    @InjectRepository(Outlet)
    private readonly outlets: Repository<Outlet>,
  ) {}

  async outletSettlements(query: OutletSettlementQuery = {}): Promise<OutletSettlementSummary[]> {
    const window = this.normalizeSettlementWindow(query);
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
         AND (so.updated_at AT TIME ZONE $3)::date BETWEEN $4::date AND $5::date
         AND EXISTS (
           SELECT 1
           FROM payments p
           WHERE p.master_order_id = so.master_order_id
             AND p.status = $2::payment_status
         )
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
          INNER JOIN payments p
            ON p.master_order_id = so.master_order_id
          LEFT JOIN outlet_settlement_approvals osa
            ON osa.sub_order_id = so.id
          WHERE so.outlet_id = $2
            AND so.deleted_at IS NULL
            AND so.status = ANY($3::sub_order_status[])
            AND p.status = $4::payment_status
            AND (so.updated_at AT TIME ZONE $5)::date BETWEEN $6::date AND $7::date
            AND osa.id IS NULL
          ON CONFLICT (sub_order_id) DO NOTHING
        `,
        [
          user.id,
          outletId,
          COMPLETED_SUB_ORDER_STATUSES,
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
    const outlet = query.outletId ? await this.outlets.findOneBy({ id: query.outletId }) : null;

    if (query.outletId && !outlet) {
      throw new NotFoundException("Outlet not found");
    }

    const momentConfig = this.configService.get("payments.moment", { infer: true });
    if (!momentConfig.secretKey) {
      throw new BadRequestException("Moment settlement report export is not configured");
    }

    const path = momentConfig.settlementReportPath.trim();
    if (!path) {
      throw new BadRequestException("Moment settlement report path is not configured");
    }

    const url = new URL(path.startsWith("/") ? path : `/${path}`, momentConfig.baseUrl);
    url.searchParams.set("date_from", window.dateFrom);
    url.searchParams.set("date_to", window.dateTo);
    url.searchParams.set("report_type", "settlement");
    if (outlet?.settlementSubaccountCode) {
      url.searchParams.set("subaccount_code", outlet.settlementSubaccountCode);
    }

    const response = await fetch(url, {
      headers: {
        accept: "text/csv, application/csv, application/json",
        authorization: `Bearer ${momentConfig.secretKey}`,
      },
    });

    const content = await response.text();
    if (!response.ok) {
      throw new BadGatewayException("Unable to retrieve settlement report from Moment");
    }

    return {
      filename: this.momentReportFilename(response, window, outlet?.name ?? "all-outlets"),
      contentType: response.headers.get("content-type") ?? "text/csv",
      content,
    };
  }

  private toSettlementSummary(
    row: SettlementRow,
    window: Required<Pick<OutletSettlementQuery, "dateFrom" | "dateTo">>,
  ): OutletSettlementSummary {
    const completedSubOrders = Number(row.completedSubOrders);
    const pendingSubOrders = Number(row.pendingSubOrders);
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
      grossMinor: Number(row.grossMinor),
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
      grossMinor: 0,
      commissionMinor: 0,
      netMinor: 0,
      currency: "NGN",
      status: "NO_ACTIVITY",
      approvalAvailable: false,
      approvalUnavailableReason: "No completed paid sub-orders in this settlement window",
      latestApprovedAt: null,
    };
  }

  private momentReportFilename(
    response: Response,
    window: Required<Pick<OutletSettlementQuery, "dateFrom" | "dateTo">>,
    outletName: string,
  ): string {
    const disposition = response.headers.get("content-disposition");
    const match = disposition?.match(/filename="?([^";]+)"?/i);
    if (match?.[1]) {
      return match[1];
    }

    return `moment-settlements-${slugify(outletName)}-${window.dateFrom}-to-${window.dateTo}.csv`;
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
      return "No completed paid sub-orders in this settlement window";
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
  settlementDateFrom: string;
  settlementDateTo: string;
  completedSubOrders: number;
  pendingSubOrders: number;
  grossMinor: number;
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

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
