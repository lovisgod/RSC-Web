import { Button } from "@rsc/ui";
import Skeleton from "@mui/material/Skeleton";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { useApproveOutletSettlement, useOutletSettlements } from "../hooks/use-outlet-settlements";
import { useOutletsLive } from "../hooks/use-outlets-live";
import { exportOutletSettlements } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

const moneyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function formatMinor(amountMinor: number) {
  return moneyFormatter.format(amountMinor / 100);
}

function lagosDateInputValue(offsetDays = 0): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
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

function downloadFile(filename: string, content: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

export function FinancialReconciliationPage() {
  const [dateFrom, setDateFrom] = useState(() => lagosDateInputValue(-1));
  const [dateTo, setDateTo] = useState(() => lagosDateInputValue(-1));
  const [outletId, setOutletId] = useState("");
  const settlementQuery = useMemo(
    () => ({
      dateFrom,
      dateTo,
      ...(outletId ? { outletId } : {}),
    }),
    [dateFrom, dateTo, outletId],
  );
  const { data: outlets = [] } = useOutletsLive();
  const { data: settlements = [], isLoading } = useOutletSettlements(settlementQuery);
  const {
    mutate: approveSettlement,
    isPending: isApproving,
    variables,
  } = useApproveOutletSettlement();
  const exportMutation = useMutation({
    mutationFn: exportOutletSettlements,
    onSuccess: (report) => {
      downloadFile(report.filename, report.content, report.contentType);
      toastBus.emit("Settlement report exported", "success");
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });
  const exportDisabled = isLoading || settlements.length === 0 || !dateFrom || !dateTo;

  function handleExport() {
    exportMutation.mutate(settlementQuery);
  }

  return (
    <div className="panel recon-panel">
      <div className="recon-panel__head">
        <div>
          <h2>Outlet Settlement Accounts Matrix</h2>
          <p className="recon-panel__hint">
            Settlement approval opens the next day after the selected settlement window.
          </p>
        </div>
        <Button
          tone="quiet"
          type="button"
          disabled={exportDisabled || exportMutation.isPending}
          onClick={handleExport}
        >
          {exportMutation.isPending ? "Exporting..." : "Export Settlements Report (CSV)"}
        </Button>
      </div>

      <div className="settlement-filters" aria-label="Settlement filters">
        <label className="settlement-filter">
          <span>From</span>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(event) => setDateFrom(event.target.value)}
          />
        </label>
        <label className="settlement-filter">
          <span>To</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </label>
        <label className="settlement-filter settlement-filter--outlet">
          <span>Outlet</span>
          <select value={outletId} onChange={(event) => setOutletId(event.target.value)}>
            <option value="">All outlets</option>
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name}
              </option>
            ))}
          </select>
        </label>
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
              : settlements.map((settlement) => {
                  const isCurrentApproval =
                    isApproving &&
                    variables?.outletId === settlement.outletId &&
                    variables.dateFrom === dateFrom &&
                    variables.dateTo === dateTo;
                  const canApprove = settlement.approvalAvailable;

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
                          title={settlement.approvalUnavailableReason ?? undefined}
                          onClick={() =>
                            approveSettlement({
                              outletId: settlement.outletId,
                              dateFrom,
                              dateTo,
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
    </div>
  );
}
