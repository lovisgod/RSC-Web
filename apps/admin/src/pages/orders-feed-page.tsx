import { EmptyState } from "@rsc/ui";
import type { MasterOrderStatus } from "@rsc/contracts";
import Skeleton from "@mui/material/Skeleton";
import { Search, ShoppingBag } from "lucide-react";
import { useState } from "react";

import { useOrdersFeed } from "../hooks/use-orders-feed";

const COLUMNS = 8;

function statusLabel(status: MasterOrderStatus): string {
  switch (status) {
    case "PENDING_PAYMENT":
      return "Awaiting Payment";
    case "CONFIRMED":
      return "Confirmed";
    case "PARTIALLY_READY":
      return "Part Ready";
    case "READY":
      return "Ready";
    case "OUT_FOR_DELIVERY":
      return "On Delivery";
    case "DELIVERED":
      return "Delivered";
    case "CANCELLED":
      return "Cancelled";
  }
}

function statusBadgeClass(status: MasterOrderStatus): string {
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
  const [query, setQuery] = useState("");
  const { data: orders, isLoading } = useOrdersFeed(query);

  return (
    <div className="panel orders-panel">
      <div className="orders-panel__head">
        <h2 className="orders-panel__title">All Orders Log</h2>
        <label className="orders-search">
          <Search aria-hidden="true" size={16} />
          <span className="sr-only">Search orders</span>
          <input
            type="search"
            placeholder="Search Order ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>
                Master
                <br />
                Order ID
              </th>
              <th>
                Date &amp;
                <br />
                Time
              </th>
              <th>
                Delivery /<br />
                Takeout
              </th>
              <th>
                Sub-Orders
                <br />
                (Outlets)
              </th>
              <th>
                Grand
                <br />
                Total
              </th>
              <th>
                Order
                <br />
                Status
              </th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: COLUMNS - 2 }).map((_, j) => (
                    <td key={j}>
                      <Skeleton variant="text" sx={{ fontSize: "1rem" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : orders && orders.length > 0 ? (
              orders.map((order) => (
                <tr key={order.id}>
                  <td className="text-mono">{order.id.slice(0, 8).toUpperCase()}</td>
                  <td>
                    {new Date(order.createdAt).toLocaleString("en-GB", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td>{order.deliveryAddress ? "DELIVERY" : "TAKEOUT"}</td>
                  <td>
                    <strong>{order.subOrders.length}</strong>
                    {order.subOrders.length > 0 && (
                      <small className="table-note">
                        {order.subOrders.map((s) => s.outletName).join(", ")}
                      </small>
                    )}
                  </td>
                  <td>₦{(order.totalAmountMinor / 100).toLocaleString()}</td>
                  <td>
                    <span className={`badge ${statusBadgeClass(order.status)}`}>
                      {statusLabel(order.status)}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="link-btn">
                      View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={COLUMNS} className="table-empty">
                  <EmptyState
                    icon={<ShoppingBag size={32} />}
                    heading="No active transactions in platform feed"
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
