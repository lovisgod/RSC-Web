import { EmptyState } from "@rsc/ui";
import type { MasterOrderStatus } from "@rsc/contracts";
import Skeleton from "@mui/material/Skeleton";
import { ShoppingBag } from "lucide-react";
import { useState } from "react";

import { OrderDetailModal } from "../components/order-detail-modal";
import { useOrdersFeed } from "../hooks/use-orders-feed";
import { useOutletsLive } from "../hooks/use-outlets-live";
import type { AdminOrderItem } from "../lib/api";
import { orderStatusClass } from "../lib/order-status";

const COLUMNS = 7;

const STATUS_OPTIONS: { value: MasterOrderStatus | ""; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "PENDING_PAYMENT", label: "Awaiting Payment" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PARTIALLY_READY", label: "Part Ready" },
  { value: "READY", label: "Ready" },
  { value: "OUT_FOR_DELIVERY", label: "On Delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

function statusLabel(status: string): string {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

function formatOrderDateTime(value: string): string {
  const date = new Date(value);
  const day = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = date.toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${day} · ${time}`;
}

function deliveryModeLabel(mode: string): string {
  if (mode === "DELIVERY") return "Delivery";
  if (mode === "TAKEOUT") return "Takeout";
  return mode;
}

function outletBadgeTone(outletId: string): number {
  let hash = 0;

  for (const character of outletId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return (hash % 6) + 1;
}

export function OrdersFeedPage() {
  const { data: outlets } = useOutletsLive();

  const [outletName, setOutletName] = useState("");
  const [status, setStatus] = useState<MasterOrderStatus | "">("");
  const [deliveryMode, setDeliveryMode] = useState<"" | "DELIVERY" | "TAKEOUT">("");
  const [viewingOrder, setViewingOrder] = useState<AdminOrderItem | null>(null);

  // Resolve selected outlet name → ID for the API
  const selectedOutletId = outlets?.find((o) => o.name === outletName)?.id;
  // Build an id→OutletSummary lookup for the detail modal
  const outletById = Object.fromEntries((outlets ?? []).map((o) => [o.id, o]));

  const { data, isLoading } = useOrdersFeed({
    ...(selectedOutletId ? { outletId: selectedOutletId } : {}),
    ...(status ? { status } : {}),
    ...(deliveryMode ? { deliveryMode } : {}),
  });

  const orders = data?.orders ?? [];

  return (
    <>
      {viewingOrder && (
        <OrderDetailModal
          item={viewingOrder}
          outletById={outletById}
          onClose={() => setViewingOrder(null)}
        />
      )}
      <div className="panel orders-panel">
        <div className="orders-panel__head">
          <h2 className="orders-panel__title">All Orders Log</h2>

          <div className="orders-filters">
            <select
              className="field-input orders-filter-select"
              value={outletName}
              onChange={(e) => setOutletName(e.target.value)}
              aria-label="Filter by outlet"
            >
              <option value="">All Outlets</option>
              {outlets?.map((o) => (
                <option key={o.id} value={o.name}>
                  {o.name}
                </option>
              ))}
            </select>

            <select
              className="field-input orders-filter-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as MasterOrderStatus | "")}
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <select
              className="field-input orders-filter-select"
              value={deliveryMode}
              onChange={(e) => setDeliveryMode(e.target.value as "" | "DELIVERY" | "TAKEOUT")}
              aria-label="Filter by delivery mode"
            >
              <option value="">All Modes</option>
              <option value="DELIVERY">Delivery</option>
              <option value="TAKEOUT">Takeout</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date &amp; Time</th>
                <th>Mode</th>
                <th className="order-outlets-heading">Outlet(s)</th>
                <th>Total</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: COLUMNS }).map((_, j) => (
                      <td key={j}>
                        <Skeleton variant="text" sx={{ fontSize: "1rem" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : orders.length > 0 ? (
                orders.map((item) => {
                  const { order, subOrders } = item;
                  const orderOutlets = subOrders.map((subOrder) => ({
                    id: subOrder.outletId,
                    name: outletById[subOrder.outletId]?.name ?? subOrder.outletId.slice(0, 8),
                  }));

                  return (
                    <tr key={order.id}>
                      <td className="text-mono">{order.id.slice(0, 8).toUpperCase()}</td>
                      <td className="order-date-time">{formatOrderDateTime(order.createdAt)}</td>
                      <td>
                        <span
                          className={`order-delivery-mode order-delivery-mode--${order.deliveryMode.toLowerCase()}`}
                        >
                          {deliveryModeLabel(order.deliveryMode)}
                        </span>
                      </td>
                      <td>
                        <div
                          className={`order-outlet-badges${
                            orderOutlets.length === 2 ? " order-outlet-badges--stacked" : ""
                          }`}
                        >
                          {orderOutlets.length > 0
                            ? orderOutlets.map((outlet) => (
                                <span
                                  key={outlet.id}
                                  className={`order-outlet-badge order-outlet-badge--${outletBadgeTone(outlet.id)}`}
                                >
                                  {outlet.name}
                                </span>
                              ))
                            : "—"}
                        </div>
                      </td>
                      <td>₦{(order.totalMinor / 100).toLocaleString()}</td>
                      <td>
                        <span className={`badge order-status ${orderStatusClass(order.status)}`}>
                          {statusLabel(order.status)}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => setViewingOrder(item)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={COLUMNS} className="table-empty">
                    <EmptyState
                      icon={<ShoppingBag size={32} />}
                      heading="No orders match the current filters"
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {data && data.total > data.limit && (
          <p className="orders-pagination-hint">
            Showing {data.limit} of {data.total} orders
          </p>
        )}
      </div>
    </>
  );
}
