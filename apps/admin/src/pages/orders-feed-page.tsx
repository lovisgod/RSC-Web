import { EmptyState } from "@rsc/ui";
import type { MasterOrderStatus } from "@rsc/contracts";
import Skeleton from "@mui/material/Skeleton";
import { ShoppingBag } from "lucide-react";
import { useState } from "react";

import { OrderDetailModal } from "../components/order-detail-modal";
import { useOrdersFeed } from "../hooks/use-orders-feed";
import { useOutletsLive } from "../hooks/use-outlets-live";
import type { AdminOrderItem } from "../lib/api";

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

function statusBadgeClass(status: string): string {
  switch (status) {
    case "DELIVERED":
      return "badge--paid";
    case "CANCELLED":
      return "badge--failed";
    case "PENDING_PAYMENT":
      return "badge--pending";
    default:
      return "";
  }
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
                <th>Outlet(s)</th>
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
                  const outletNames = subOrders
                    .map((s) => outletById[s.outletId]?.name ?? s.outletId.slice(0, 8))
                    .join(", ");

                  return (
                    <tr key={order.id}>
                      <td className="text-mono">{order.id.slice(0, 8).toUpperCase()}</td>
                      <td>
                        {new Date(order.createdAt).toLocaleString("en-GB", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td>{order.deliveryMode}</td>
                      <td>
                        <strong>{subOrders.length}</strong>
                        {outletNames && <small className="table-note">{outletNames}</small>}
                      </td>
                      <td>₦{(order.totalMinor / 100).toLocaleString()}</td>
                      <td>
                        <span className={`badge ${statusBadgeClass(order.status)}`}>
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
