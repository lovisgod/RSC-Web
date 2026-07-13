import Skeleton from "@mui/material/Skeleton";
import { Button } from "@rsc/ui";
import { Download, X } from "lucide-react";
import { useMemo, useState } from "react";

import { useOrdersFeed } from "../hooks/use-orders-feed";
import { useOutletsLive } from "../hooks/use-outlets-live";
import { useApproveOutletSettlement, useOutletSettlements } from "../hooks/use-outlet-settlements";
import type { AdminOrderItem } from "../lib/api";

const REPORT_LIMIT = 100;
const COMPLETED_SUB_ORDER_STATUSES = new Set(["COLLECTED", "DISPATCHED"]);

type ExportFormat = "csv" | "pdf";

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

function pdfEscape(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function buildSimplePdf(title: string, rows: ReconciliationRow[]) {
  const contentLines = [
    title,
    "",
    "Outlet | Completed | Gross | Net | Status",
    ...rows.map(
      (row) =>
        `${row.outletName} | ${row.completedSubOrders} | ${formatMinor(row.grossMinor)} | ${formatMinor(row.netMinor)} | ${statusLabel(row.status)}`,
    ),
  ];
  const stream = [
    "BT",
    "/F1 11 Tf",
    "40 790 Td",
    ...contentLines.flatMap((line, index) => [
      index === 0 ? "/F1 16 Tf" : index === 1 ? "/F1 11 Tf" : "",
      `(${pdfEscape(line.slice(0, 105))}) Tj`,
      "0 -18 Td",
    ]),
    "ET",
  ]
    .filter(Boolean)
    .join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
}

function ExportSettlementsModal({
  outlets,
  onClose,
  onExport,
}: {
  outlets: Array<{ id: string; name: string }>;
  onClose: () => void;
  onExport: (options: { outletId: string; format: ExportFormat }) => void;
}) {
  const [outletId, setOutletId] = useState("all");
  const [format, setFormat] = useState<ExportFormat>("csv");

  return (
    <div className="modal-overlay" aria-hidden="true" onClick={onClose}>
      <div
        className="modal"
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
          <label className="modal-row">
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

          <label className="modal-row">
            <span>Format</span>
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value as ExportFormat)}
            >
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
            </select>
          </label>

          <div className="modal__actions">
            <Button tone="quiet" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button tone="navy" type="button" onClick={() => onExport({ outletId, format })}>
              <Download aria-hidden="true" size={16} />
              Download
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FinancialReconciliationPage() {
  const today = getTodayInputDate();
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [exportOpen, setExportOpen] = useState(false);
  const normalizedRange = normalizeDateRange(dateFrom, dateTo);
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

  function handleExport(options: { outletId: string; format: ExportFormat }) {
    const selectedRows =
      options.outletId === "all" ? rows : rows.filter((row) => row.outletId === options.outletId);
    const outletLabel =
      options.outletId === "all"
        ? "all-outlets"
        : (outlets.find((outlet) => outlet.id === options.outletId)?.name ?? "outlet")
            .toLowerCase()
            .replaceAll(/\s+/g, "-");
    const rangeLabel =
      normalizedRange.dateFrom === normalizedRange.dateTo
        ? normalizedRange.dateFrom
        : `${normalizedRange.dateFrom}_to_${normalizedRange.dateTo}`;
    const filename = `rsc-settlements-${outletLabel}-${rangeLabel}.${options.format}`;

    if (options.format === "csv") {
      downloadBlob(
        new Blob([buildCsv(selectedRows)], { type: "text/csv;charset=utf-8" }),
        filename,
      );
    } else {
      const pdf = buildSimplePdf(`RSC Settlement Report - ${rangeLabel}`, selectedRows);
      downloadBlob(new Blob([pdf], { type: "application/pdf" }), filename);
    }

    setExportOpen(false);
  }

  return (
    <>
      {exportOpen && (
        <ExportSettlementsModal
          outlets={outlets.map((outlet) => ({ id: outlet.id, name: outlet.name }))}
          onClose={() => setExportOpen(false)}
          onExport={handleExport}
        />
      )}

      <div className="panel recon-panel">
        <div className="recon-panel__head">
          <div>
            <h2>Outlet Settlement Accounts Matrix</h2>
            <p className="muted-text">
              Showing successful-payment outlet transactions for the selected date range.
            </p>
          </div>
          <div className="recon-actions">
            <label className="rider-date-filter">
              <span>From</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </label>
            <label className="rider-date-filter">
              <span>To</span>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </label>
            <Button tone="quiet" type="button" onClick={() => setExportOpen(true)}>
              <Download aria-hidden="true" size={16} />
              Export
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
