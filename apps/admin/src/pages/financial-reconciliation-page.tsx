import { Button } from "@rsc/ui";
import Skeleton from "@mui/material/Skeleton";

import { useOutletsLive } from "../hooks/use-outlets-live";

export function FinancialReconciliationPage() {
  const { data: outlets, isLoading } = useOutletsLive();

  return (
    <div className="panel recon-panel">
      <div className="recon-panel__head">
        <h2>Outlet Settlement Accounts Matrix</h2>
        <Button tone="quiet">💾 Export Settlements Report (CSV)</Button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Outlet Name</th>
              <th>Payment Gateway Sub-Account</th>
              <th>Completed Sub-Orders</th>
              <th>Gross Volume</th>
              <th>RSC Commission (15%)</th>
              <th>Net Payable</th>
              <th>Payout Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}>
                        <Skeleton variant="text" sx={{ fontSize: "1rem" }} />
                      </td>
                    ))}
                  </tr>
                ))
              : outlets?.map((outlet) => (
                  <tr key={outlet.id}>
                    <td>
                      <div className="outlet-name-cell">
                        <div className="outlet-cell-avatar">
                          {outlet.imageUrl ? (
                            <img src={outlet.imageUrl} alt="" className="outlet-cell-avatar__img" />
                          ) : (
                            <span aria-hidden="true">{outlet.name.charAt(0)}</span>
                          )}
                        </div>
                        <strong>{outlet.name}</strong>
                      </div>
                    </td>
                    <td className="text-mono">{outlet.momentSubaccountCode}</td>
                    <td>0</td>
                    <td>
                      <span className="amount amount--negative">₦0</span>
                    </td>
                    <td>
                      <span className="amount amount--negative">₦0</span>
                    </td>
                    <td>
                      <span className="amount amount--positive">₦0</span>
                    </td>
                    <td>
                      <span className="badge badge--pending">Pending Approval</span>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
