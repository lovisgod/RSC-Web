import { Button } from "@rsc/ui";
import Skeleton from "@mui/material/Skeleton";

import { useApproveOutletSettlement, useOutletSettlements } from "../hooks/use-outlet-settlements";

const moneyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

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

export function FinancialReconciliationPage() {
  const { data: settlements, isLoading } = useOutletSettlements();
  const {
    mutate: approveSettlement,
    isPending: isApproving,
    variables,
  } = useApproveOutletSettlement();

  return (
    <div className="panel recon-panel">
      <div className="recon-panel__head">
        <h2>Outlet Settlement Accounts Matrix</h2>
        <Button tone="quiet">Export Settlements Report (CSV)</Button>
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
              : settlements?.map((settlement) => {
                  const isCurrentApproval = isApproving && variables === settlement.outletId;
                  const canApprove =
                    settlement.status === "PENDING" &&
                    settlement.pendingSubOrders > 0 &&
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
  );
}
