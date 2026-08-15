import { Button, MetricCard, formatMoney } from "@rsc/ui";
import { Clock3, ReceiptText, Truck } from "lucide-react";
import { useEffect, useState } from "react";

import {
  getNativeBridgeCapabilities,
  printReceipt,
  type NativeBridgeCapabilities,
} from "../lib/native-bridge";
import { toastBus } from "../lib/toast-bus";

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

function buildSampleReceipt() {
  return {
    receiptId: `sample:${Date.now()}`,
    orderId: "SO-1040",
    title: "Sample kitchen ticket",
    outletName: "DineOut NG Outlet",
    deliveryMode: "TAKEOUT" as const,
    printedAt: new Date().toISOString(),
    currency: "NGN" as const,
    items: [
      {
        name: "Plantain Combo",
        quantity: 1,
        unitPriceMinor: 650_000,
        lineTotalMinor: 650_000,
      },
    ],
    totals: {
      subtotalMinor: 650_000,
      totalMinor: 650_000,
    },
    footer: "Sample receipt for printer setup.",
  };
}

export function DashboardPage() {
  const [capabilities, setCapabilities] = useState<NativeBridgeCapabilities | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getNativeBridgeCapabilities().then((nextCapabilities) => {
      if (!cancelled) setCapabilities(nextCapabilities);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleTestPrint() {
    try {
      const result = await printReceipt(buildSampleReceipt());

      if (!result.printed) {
        toastBus.emit("Printer bridge is unavailable in this browser session", "warning");
        return;
      }

      if (!result.success) {
        toastBus.emit(result.message ?? "Printer could not complete the sample receipt", "error");
        return;
      }

      toastBus.emit(result.message ?? "Sample receipt sent to printer", "success");
    } catch (error) {
      toastBus.emit(error instanceof Error ? error.message : "Printer connection failed", "error");
    }
  }

  const printerReady = capabilities?.printReceipt ?? false;

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
        <Button onClick={() => void handleTestPrint()}>Test print</Button>
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
                <strong>
                  {printerReady ? "Printer bridge ready" : "Printer bridge unavailable"}
                </strong>
                <small>
                  {printerReady
                    ? "Flutter shell can receive receipt print commands"
                    : "Open in the POS shell to connect thermal printing"}
                </small>
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
