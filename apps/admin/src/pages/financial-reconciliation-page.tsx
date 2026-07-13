import Skeleton from "@mui/material/Skeleton";
import { Button } from "@rsc/ui";
import { Download, X } from "lucide-react";
import { useMemo, useState } from "react";

import { useOrdersFeed } from "../hooks/use-orders-feed";
import { useOutletsLive } from "../hooks/use-outlets-live";
import { useApproveOutletSettlement, useOutletSettlements } from "../hooks/use-outlet-settlements";
import { listAdminOrders, type AdminOrderItem } from "../lib/api";

const REPORT_LIMIT = 100;
const COMPLETED_SUB_ORDER_STATUSES = new Set(["COLLECTED", "DISPATCHED"]);
type ExportDateMode = "single" | "range";

interface ReconciliationRow {
  outletId: string;
  outletName: string;
  imageUrl: string | null;
  subaccountCode: string | null;
  completedSubOrders: number;
  pendingSubOrders: number;
  grossMinor: number;
  commissionMinor: number;
  netMinor: number;
  status: "NO_ACTIVITY" | "PENDING" | "APPROVED";
}

const moneyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function getTodayInputDate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);

  return local.toISOString().slice(0, 10);
}

function getDateRange(dateFrom: string, dateTo: string): { fromIso: string; toIso: string } {
  return {
    fromIso: new Date(`${dateFrom}T00:00:00`).toISOString(),
    toIso: new Date(`${dateTo}T23:59:59.999`).toISOString(),
  };
}

function includesToday(dateFrom: string, dateTo: string): boolean {
  const today = getTodayInputDate();
  return dateFrom <= today && today <= dateTo;
}

function formatMinor(amountMinor: number) {
  return moneyFormatter.format(amountMinor / 100);
}

function statusLabel(status: "NO_ACTIVITY" | "PENDING" | "APPROVED") {
  if (status === "APPROVED") return "Approved";
  if (status === "PENDING") return "Pending Approval";
  return "No Completed Orders";
}

function statusClass(status: "NO_ACTIVITY" | "PENDING" | "APPROVED") {
  if (status === "APPROVED") return "badge--paid";
  if (status === "PENDING") return "badge--pending";
  return "badge--neutral";
}

function normalizeDateRange(dateFrom: string, dateTo: string) {
  return dateFrom <= dateTo ? { dateFrom, dateTo } : { dateFrom: dateTo, dateTo: dateFrom };
}

function buildRows(
  orderItems: AdminOrderItem[],
  outlets: NonNullable<ReturnType<typeof useOutletsLive>["data"]>,
  settlementRows: ReconciliationRow[],
): ReconciliationRow[] {
  const rows = new Map<string, ReconciliationRow>();
  const outletById = new Map(outlets.map((outlet) => [outlet.id, outlet]));
  const settlementByOutlet = new Map(
    settlementRows.map((settlement) => [settlement.outletId, settlement]),
  );

  for (const outlet of outlets) {
    const settlement = settlementByOutlet.get(outlet.id);
    rows.set(outlet.id, {
      outletId: outlet.id,
      outletName: outlet.name,
      imageUrl: outlet.imageUrl,
      subaccountCode: settlement?.subaccountCode ?? outlet.settlementSubaccountCode ?? null,
      completedSubOrders: 0,
      pendingSubOrders: 0,
      grossMinor: 0,
      commissionMinor: 0,
      netMinor: 0,
      status: settlement?.status ?? "NO_ACTIVITY",
    });
  }

  for (const item of orderItems) {
    if (item.order.status === "PENDING_PAYMENT") continue;

    for (const subOrder of item.subOrders) {
      const outlet = outletById.get(subOrder.outletId);
      const settlement = settlementByOutlet.get(subOrder.outletId);
      const existing =
        rows.get(subOrder.outletId) ??
        ({
          outletId: subOrder.outletId,
          outletName: outlet?.name ?? `Outlet ${subOrder.outletId.slice(0, 8)}`,
          imageUrl: outlet?.imageUrl ?? null,
          subaccountCode: settlement?.subaccountCode ?? outlet?.settlementSubaccountCode ?? null,
          completedSubOrders: 0,
          pendingSubOrders: 0,
          grossMinor: 0,
          commissionMinor: 0,
          netMinor: 0,
          status: settlement?.status ?? "NO_ACTIVITY",
        } satisfies ReconciliationRow);

      if (COMPLETED_SUB_ORDER_STATUSES.has(subOrder.status)) {
        existing.completedSubOrders += 1;
        existing.grossMinor += subOrder.subtotalMinor;
        existing.commissionMinor += subOrder.commissionMinor;
        existing.netMinor += subOrder.netMinor;
      } else if (subOrder.status !== "REJECTED") {
        existing.pendingSubOrders += 1;
      }

      if (existing.status !== "APPROVED" && existing.completedSubOrders > 0) {
        existing.status = "PENDING";
      }

      rows.set(subOrder.outletId, existing);
    }
  }

  return Array.from(rows.values()).sort((left, right) => {
    if (right.completedSubOrders !== left.completedSubOrders) {
      return right.completedSubOrders - left.completedSubOrders;
    }

    return left.outletName.localeCompare(right.outletName);
  });
}

function csvEscape(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function buildCsv(rows: ReconciliationRow[]) {
  const headers = [
    "Outlet",
    "Settlement Subaccount",
    "Completed Sub-Orders",
    "Pending Sub-Orders",
    "Gross Volume",
    "RSC Commission",
    "Net Payable",
    "Payout Status",
  ];
  const lines = rows.map((row) =>
    [
      row.outletName,
      row.subaccountCode ?? "",
      row.completedSubOrders,
      row.pendingSubOrders,
      row.grossMinor / 100,
      row.commissionMinor / 100,
      row.netMinor / 100,
      statusLabel(row.status),
    ]
      .map(csvEscape)
      .join(","),
  );

  return [headers.map(csvEscape).join(","), ...lines].join("\n");
}

function ExportSettlementsModal({
  outlets,
  initialDate,
  isExporting,
  maxDate,
  onClose,
  onExport,
}: {
  outlets: Array<{ id: string; name: string }>;
  initialDate: string;
  isExporting: boolean;
  maxDate: string;
  onClose: () => void;
  onExport: (options: { outletId: string; dateFrom: string; dateTo: string }) => void;
}) {
  const [outletId, setOutletId] = useState("all");
  const [dateMode, setDateMode] = useState<ExportDateMode>("single");
  const [singleDate, setSingleDate] = useState(initialDate);
  const [dateFrom, setDateFrom] = useState(initialDate);
  const [dateTo, setDateTo] = useState(initialDate);
  const normalizedExportRange =
    dateMode === "single"
      ? { dateFrom: singleDate, dateTo: singleDate }
      : normalizeDateRange(dateFrom, dateTo);

  return (
    <div className="modal-overlay" aria-hidden="true" onClick={onClose}>
      <div
        className="modal modal--settlement-export"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-settlements-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__head">
          <div>
            <span className="modal-kicker">Export report</span>
            <h2 id="export-settlements-title">Download settlement transactions</h2>
          </div>
          <button type="button" className="modal__close" aria-label="Close" onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="modal__body">
          <div className="settlement-export-card">
            <label className="settlement-field">
              <span>Outlet</span>
              <select value={outletId} onChange={(event) => setOutletId(event.target.value)}>
                <option value="all">All outlets</option>
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="settlement-field">
              <span>Date selection</span>
              <select
                value={dateMode}
                onChange={(event) => setDateMode(event.target.value as ExportDateMode)}
              >
                <option value="single">Single date</option>
                <option value="range">Date range</option>
              </select>
            </label>
          </div>

          {dateMode === "single" ? (
            <label className="settlement-field settlement-field--full">
              <span>Report date</span>
              <input
                type="date"
                value={singleDate}
                max={maxDate}
                onChange={(event) => setSingleDate(event.target.value)}
              />
            </label>
          ) : (
            <div className="settlement-export-card">
              <label className="settlement-field">
                <span>From</span>
                <input
                  type="date"
                  value={dateFrom}
                  max={maxDate}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </label>

              <label className="settlement-field">
                <span>To</span>
                <input
                  type="date"
                  value={dateTo}
                  max={maxDate}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </label>
            </div>
          )}

          <div className="settlement-export-note">
            <strong>CSV export</strong>
            <span>
              Downloads settlement rows for{" "}
              {normalizedExportRange.dateFrom === normalizedExportRange.dateTo
                ? normalizedExportRange.dateFrom
                : `${normalizedExportRange.dateFrom} to ${normalizedExportRange.dateTo}`}
              .
            </span>
          </div>

          <div className="modal__actions">
            <Button tone="quiet" type="button" onClick={onClose} disabled={isExporting}>
              Cancel
            </Button>
            <Button
              tone="navy"
              type="button"
              onClick={() => onExport({ outletId, ...normalizedExportRange })}
              disabled={isExporting}
            >
              <Download aria-hidden="true" size={16} />
              {isExporting ? "Preparing..." : "Download CSV"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FinancialReconciliationPage() {
  const today = getTodayInputDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const [exportOpen, setExportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const activeDate = selectedDate;
  const normalizedRange = { dateFrom: activeDate, dateTo: activeDate };
  const dateRange = useMemo(
    () => getDateRange(normalizedRange.dateFrom, normalizedRange.dateTo),
    [normalizedRange.dateFrom, normalizedRange.dateTo],
  );
  const isCurrentDateView = includesToday(normalizedRange.dateFrom, normalizedRange.dateTo);
  const { data: settlements, isLoading: isSettlementsLoading } = useOutletSettlements();
  const { data: outlets = [], isLoading: isOutletsLoading } = useOutletsLive();
  const { data: ordersData, isLoading: isOrdersLoading } = useOrdersFeed({
    dateFrom: dateRange.fromIso,
    dateTo: dateRange.toIso,
    limit: REPORT_LIMIT,
  });
  const {
    mutate: approveSettlement,
    isPending: isApproving,
    variables,
  } = useApproveOutletSettlement();

  const rows = useMemo(
    () =>
      buildRows(
        ordersData?.orders ?? [],
        outlets,
        (settlements ?? []).map((settlement) => ({ ...settlement })),
      ),
    [ordersData?.orders, outlets, settlements],
  );
  const isLoading = isSettlementsLoading || isOutletsLoading || isOrdersLoading;

  async function handleExport(options: { outletId: string; dateFrom: string; dateTo: string }) {
    setIsExporting(true);
    try {
      const exportRange = normalizeDateRange(options.dateFrom, options.dateTo);
      const exportIsoRange = getDateRange(exportRange.dateFrom, exportRange.dateTo);
      const exportOrders = await listAdminOrders({
        dateFrom: exportIsoRange.fromIso,
        dateTo: exportIsoRange.toIso,
        limit: REPORT_LIMIT,
      });
      const exportRows = buildRows(
        exportOrders.orders,
        outlets,
        (settlements ?? []).map((settlement) => ({ ...settlement })),
      );
      const selectedRows =
        options.outletId === "all"
          ? exportRows
          : exportRows.filter((row) => row.outletId === options.outletId);
      const outletLabel =
        options.outletId === "all"
          ? "all-outlets"
          : (outlets.find((outlet) => outlet.id === options.outletId)?.name ?? "outlet")
              .toLowerCase()
              .replaceAll(/\s+/g, "-");
      const rangeLabel =
        exportRange.dateFrom === exportRange.dateTo
          ? exportRange.dateFrom
          : `${exportRange.dateFrom}_to_${exportRange.dateTo}`;
      const filename = `rsc-settlements-${outletLabel}-${rangeLabel}.csv`;

      downloadBlob(
        new Blob([buildCsv(selectedRows)], { type: "text/csv;charset=utf-8" }),
        filename,
      );

      setExportOpen(false);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      {exportOpen && (
        <ExportSettlementsModal
          outlets={outlets.map((outlet) => ({ id: outlet.id, name: outlet.name }))}
          initialDate={activeDate}
          isExporting={isExporting}
          maxDate={today}
          onClose={() => setExportOpen(false)}
          onExport={handleExport}
        />
      )}

      <div className="panel recon-panel">
        <div className="recon-panel__head">
          <div className="recon-panel__title">
            <h2>Outlet Settlement Accounts Matrix</h2>
            <p className="muted-text">
              Showing successful-payment outlet transactions for {activeDate}.
            </p>
          </div>
          <div className="recon-actions">
            <label className="settlement-main-filter settlement-main-filter--date">
              <span className="sr-only">Settlement date</span>
              <input
                type="date"
                value={selectedDate}
                max={today}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            </label>
          </div>
          <div className="recon-export-action">
            <Button tone="quiet" type="button" onClick={() => setExportOpen(true)}>
              <Download aria-hidden="true" size={16} />
              Export Settlement Report (CSV)
            </Button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Outlet Name</th>
                <th>Settlement Subaccount</th>
                <th>Completed Sub-Orders</th>
                <th>Gross Volume</th>
                <th>RSC Commission</th>
                <th>Net Payable</th>
                <th>Payout Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j}>
                          <Skeleton variant="text" sx={{ fontSize: "1rem" }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : rows.map((settlement) => {
                    const isCurrentApproval = isApproving && variables === settlement.outletId;
                    const canApprove =
                      !isCurrentDateView &&
                      settlement.status === "PENDING" &&
                      settlement.completedSubOrders > 0 &&
                      !!settlement.subaccountCode;

                    return (
                      <tr key={settlement.outletId}>
                        <td>
                          <div className="outlet-name-cell">
                            <div className="outlet-cell-avatar">
                              {settlement.imageUrl ? (
                                <img
                                  src={settlement.imageUrl}
                                  alt=""
                                  className="outlet-cell-avatar__img"
                                />
                              ) : (
                                <span aria-hidden="true">{settlement.outletName.charAt(0)}</span>
                              )}
                            </div>
                            <strong>{settlement.outletName}</strong>
                          </div>
                        </td>
                        <td className="text-mono">{settlement.subaccountCode ?? "—"}</td>
                        <td>{settlement.completedSubOrders}</td>
                        <td>
                          <span className="amount">{formatMinor(settlement.grossMinor)}</span>
                        </td>
                        <td>
                          <span className="amount amount--negative">
                            {formatMinor(settlement.commissionMinor)}
                          </span>
                        </td>
                        <td>
                          <span className="amount amount--positive">
                            {formatMinor(settlement.netMinor)}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${statusClass(settlement.status)}`}>
                            {statusLabel(settlement.status)}
                          </span>
                        </td>
                        <td>
                          <Button
                            tone="navy"
                            type="button"
                            disabled={!canApprove || isCurrentApproval}
                            title={
                              isCurrentDateView
                                ? "Current-day settlements can only be approved from the next day."
                                : undefined
                            }
                            onClick={() => approveSettlement(settlement.outletId)}
                          >
                            {isCurrentApproval ? "Approving..." : "Approve Settlement"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
