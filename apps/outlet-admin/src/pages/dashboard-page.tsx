import { Button, MetricCard, formatMoney } from "@rsc/ui";
import { Clock3, ReceiptText, Truck } from "lucide-react";

import { printReceipt } from "../lib/native-bridge";

const overview = {
  newOrders: 12,
  preparing: 8,
  readyForPickup: 4,
  sales: { amountMinor: 2_845_000, currency: "NGN" as const },
};

const orderRows = [
  {
    id: "SO-1038",
    customer: "Ada",
    items: "Jollof Bowl, Chapman",
    status: "Preparing",
    due: "8 min",
  },
  { id: "SO-1039", customer: "Tomi", items: "Peppered Chicken", status: "New", due: "12 min" },
  { id: "SO-1040", customer: "Musa", items: "Plantain Combo", status: "Ready", due: "Now" },
] as const;

export function DashboardPage() {
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="kicker">Today&apos;s service</p>
          <h1>Run the outlet from one desk.</h1>
          <p>
            Track orders, menu availability, riders, and POS printing from an outlet-scoped app.
          </p>
        </div>
        <Button
          onClick={() =>
            void printReceipt({
              orderId: "SO-1040",
              title: "Sample kitchen ticket",
              lines: [{ label: "Plantain Combo", quantity: 1, amountMinor: 650_000 }],
              totalMinor: 650_000,
              currency: "NGN",
            })
          }
        >
          Test print
        </Button>
      </section>

      <section className="metric-grid" aria-label="Outlet overview">
        <MetricCard label="New orders" value={overview.newOrders} detail="Awaiting acceptance" />
        <MetricCard label="Preparing" value={overview.preparing} detail="In kitchen right now" />
        <MetricCard
          label="Ready"
          value={overview.readyForPickup}
          detail="Waiting for dispatch"
          tone="warning"
        />
        <MetricCard label="Sales today" value={formatMoney(overview.sales)} detail="Gross sales" />
      </section>

      <section className="dashboard-grid">
        <article className="panel panel--wide">
          <div className="panel__heading">
            <div>
              <p className="kicker">Kitchen queue</p>
              <h2>Active orders</h2>
            </div>
            <Button tone="quiet">View all</Button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {orderRows.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.id}</strong>
                    </td>
                    <td>{order.customer}</td>
                    <td>{order.items}</td>
                    <td>
                      <span className="status-pill status-pill--on">{order.status}</span>
                    </td>
                    <td>{order.due}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <div className="panel__heading">
            <div>
              <p className="kicker">Station health</p>
              <h2>Operations</h2>
            </div>
          </div>
          <ul className="attention-list">
            <li>
              <span className="attention-icon">
                <ReceiptText aria-hidden="true" size={18} />
              </span>
              <span>
                <strong>Printer bridge ready</strong>
                <small>Uses browser fallback outside Flutter</small>
              </span>
            </li>
            <li>
              <span className="attention-icon attention-icon--danger">
                <Clock3 aria-hidden="true" size={18} />
              </span>
              <span>
                <strong>2 tickets nearing SLA</strong>
                <small>Oldest due in 8 minutes</small>
              </span>
            </li>
            <li>
              <span className="attention-icon">
                <Truck aria-hidden="true" size={18} />
              </span>
              <span>
                <strong>3 riders available</strong>
                <small>One currently assigned</small>
              </span>
            </li>
          </ul>
        </article>
      </section>
    </>
  );
}
