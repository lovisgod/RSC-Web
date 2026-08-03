import Skeleton from "@mui/material/Skeleton";
import { Button, EmptyState } from "@rsc/ui";
import { useMutation } from "@tanstack/react-query";
import { Download, ReceiptText, X } from "lucide-react";
import { useMemo, useState } from "react";

import { useOutletsLive } from "../hooks/use-outlets-live";
import { useApproveOutletSettlement, useOutletSettlements } from "../hooks/use-outlet-settlements";
import type { OutletSettlementQuery } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

type ExportDateMode = "single" | "range";

interface SettlementRow {
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
  approvalAvailable: boolean;
  approvalUnavailableReason: string | null;
}

const moneyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function getTodayInputDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function normalizeDateRange(dateFrom: string, dateTo: string) {
  return dateFrom <= dateTo ? { dateFrom, dateTo } : { dateFrom: dateTo, dateTo: dateFrom };
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
  const settlementQuery = useMemo<OutletSettlementQuery>(
    () => ({ dateFrom: selectedDate, dateTo: selectedDate }),
    [selectedDate],
  );
  const { data: outlets = [] } = useOutletsLive();
  const { data: settlements = [], isLoading } = useOutletSettlements(settlementQuery);
  const {
    mutate: approveSettlement,
    isPending: isApproving,
    variables,
  } = useApproveOutletSettlement();
  const exportMutation = useMutation({
    mutationFn: async (query: OutletSettlementQuery) => {
      // TODO: Re-enable when the real CSV export endpoint is available.
      // return exportOutletSettlements(query);
      void query;
      throw new Error("Settlement CSV export is not available yet.");
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });

  const rows = useMemo<SettlementRow[]>(
    () =>
      settlements.map((settlement) => ({
        outletId: settlement.outletId,
        outletName: settlement.outletName,
        imageUrl: settlement.imageUrl,
        subaccountCode: settlement.subaccountCode,
        completedSubOrders: settlement.completedSubOrders,
        pendingSubOrders: settlement.pendingSubOrders,
        grossMinor: settlement.grossMinor,
        commissionMinor: settlement.commissionMinor,
        netMinor: settlement.netMinor,
        status: settlement.status,
        approvalAvailable: settlement.approvalAvailable,
        approvalUnavailableReason: settlement.approvalUnavailableReason,
      })),
    [settlements],
  );

  function handleExport(options: { outletId: string; dateFrom: string; dateTo: string }) {
    exportMutation.mutate({
      dateFrom: options.dateFrom,
      dateTo: options.dateTo,
      ...(options.outletId !== "all" ? { outletId: options.outletId } : {}),
    });
  }

  return (
    <>
      {exportOpen && (
        <ExportSettlementsModal
          outlets={outlets.map((outlet) => ({ id: outlet.id, name: outlet.name }))}
          initialDate={selectedDate}
          isExporting={exportMutation.isPending}
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
              Showing successful-payment outlet transactions for {selectedDate}.
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
            <Button
              tone="quiet"
              type="button"
              disabled={exportMutation.isPending}
              onClick={() => setExportOpen(true)}
            >
              <Download aria-hidden="true" size={16} />
              Export Settlement Report (CSV)
            </Button>
          </div>
        </div>

        {!isLoading && rows.length === 0 ? (
          <div className="recon-empty-state">
            <EmptyState
              icon={<ReceiptText size={34} />}
              heading="No settlement rows for this date"
              body="There are no successful-payment outlet transactions to reconcile for the selected date."
            />
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Outlet Name</th>
                  <th>Settlement Subaccount</th>
                  <th>Completed Sub-Orders</th>
                  <th>Gross Volume</th>
                  <th>DineOut NG Commission</th>
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
                      const isCurrentApproval =
                        isApproving &&
                        variables?.outletId === settlement.outletId &&
                        variables.dateFrom === selectedDate &&
                        variables.dateTo === selectedDate;

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
                              disabled={!settlement.approvalAvailable || isCurrentApproval}
                              title={settlement.approvalUnavailableReason ?? undefined}
                              onClick={() =>
                                approveSettlement({
                                  outletId: settlement.outletId,
                                  dateFrom: selectedDate,
                                  dateTo: selectedDate,
                                })
                              }
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
        )}
      </div>
    </>
  );
}
