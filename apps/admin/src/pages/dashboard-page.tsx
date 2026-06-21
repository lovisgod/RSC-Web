import { Button, MetricCard, formatMoney } from "@rsc/ui";
import { ArrowDownRight, ArrowUpRight, Clock3 } from "lucide-react";

const overview = {
  activeOutlets: 8,
  openMasterOrders: 47,
  delayedSubOrders: 6,
  pendingSettlements: { amountMinor: 18_450_000, currency: "NGN" as const },
};

const outletRows = [
  { name: "Fire & Spice", orders: 128, revenue: "₦2.84m", prep: "24 min", direction: "up" },
  { name: "Garden Bowl", orders: 96, revenue: "₦1.72m", prep: "18 min", direction: "up" },
  { name: "Sweet Room", orders: 75, revenue: "₦1.18m", prep: "31 min", direction: "down" },
] as const;

export function DashboardPage() {
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="kicker">Sunday, 21 June</p>
          <h1>Good evening. Here&apos;s the whole service.</h1>
          <p>Operational figures are illustrative until the API contract is connected.</p>
        </div>
        <Button>View live orders</Button>
      </section>

      <section className="metric-grid" aria-label="Platform overview">
        <MetricCard
          label="Active outlets"
          value={overview.activeOutlets}
          detail="All configured outlets"
        />
        <MetricCard
          label="Open master orders"
          value={overview.openMasterOrders}
          detail="Across 63 kitchen tickets"
        />
        <MetricCard
          label="Delayed sub-orders"
          value={overview.delayedSubOrders}
          detail="Needs operations attention"
          tone="warning"
        />
        <MetricCard
          label="Pending settlements"
          value={formatMoney(overview.pendingSettlements)}
          detail="Awaiting finance review"
        />
      </section>

      <section className="dashboard-grid">
        <article className="panel panel--wide">
          <div className="panel__heading">
            <div>
              <p className="kicker">Order pulse</p>
              <h2>Service volume</h2>
            </div>
            <select aria-label="Order pulse period" defaultValue="today">
              <option value="today">Today</option>
              <option value="week">This week</option>
            </select>
          </div>
          <div
            className="chart-placeholder"
            role="img"
            aria-label="Illustrative hourly order volume"
          >
            {[36, 54, 42, 68, 91, 76, 100, 84, 64, 48, 71, 57].map((height, index) => (
              <span key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
          <div className="chart-legend">
            <span>12pm</span>
            <span>3pm</span>
            <span>6pm</span>
            <span>9pm</span>
          </div>
        </article>

        <article className="panel">
          <div className="panel__heading">
            <div>
              <p className="kicker">Attention</p>
              <h2>Operations queue</h2>
            </div>
          </div>
          <ul className="attention-list">
            <li>
              <span className="attention-icon attention-icon--danger">
                <Clock3 aria-hidden="true" size={18} />
              </span>
              <span>
                <strong>6 delayed kitchen tickets</strong>
                <small>Oldest delay is 17 minutes</small>
              </span>
            </li>
            <li>
              <span className="attention-icon">₦</span>
              <span>
                <strong>3 settlements need review</strong>
                <small>Two periods close today</small>
              </span>
            </li>
            <li>
              <span className="attention-icon">!</span>
              <span>
                <strong>1 outlet is paused</strong>
                <small>Fire &amp; Spice Lekki</small>
              </span>
            </li>
          </ul>
        </article>

        <article className="panel panel--full">
          <div className="panel__heading">
            <div>
              <p className="kicker">Outlet performance</p>
              <h2>Today at a glance</h2>
            </div>
            <Button tone="quiet">Open report</Button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Outlet</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                  <th>Avg. prep</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {outletRows.map((row) => (
                  <tr key={row.name}>
                    <td>
                      <strong>{row.name}</strong>
                    </td>
                    <td>{row.orders}</td>
                    <td>{row.revenue}</td>
                    <td>{row.prep}</td>
                    <td>
                      <span className={`trend trend--${row.direction}`}>
                        {row.direction === "up" ? (
                          <ArrowUpRight aria-hidden="true" size={16} />
                        ) : (
                          <ArrowDownRight aria-hidden="true" size={16} />
                        )}
                        {row.direction === "up" ? "Healthy" : "Watch"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </>
  );
}
