import { EmptyState } from "@rsc/ui";
import Skeleton from "@mui/material/Skeleton";
import { Search, ShoppingBag } from "lucide-react";
import { useState } from "react";

import { useOrdersFeed } from "../hooks/use-orders-feed";

const COLUMNS = 8;

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
            placeholder="Search customer, Order ID..."
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
              <th>Customer</th>
              <th>
                Delivery /<br />
                Takeout
              </th>
              <th>
                Sub-Orders
                <br />
                Split
              </th>
              <th>
                Grand
                <br />
                Total
              </th>
              <th>
                Payment
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
                  {Array.from({ length: COLUMNS }).map((_, j) => (
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
                  <td>{order.customerName}</td>
                  <td>{order.fulfillmentType}</td>
                  <td>{order.subOrderCount}</td>
                  <td>₦{(order.grandTotalMinor / 100).toLocaleString()}</td>
                  <td>
                    <span
                      className={`badge ${order.paymentStatus === "PAID" ? "badge--paid" : order.paymentStatus === "FAILED" ? "badge--failed" : "badge--pending"}`}
                    >
                      {order.paymentStatus}
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
