import type { SubOrderStatus } from "@rsc/contracts";
import { ClipboardList, ReceiptText } from "lucide-react";

interface TransactionItem {
  name: string;
  quantity: number;
}

interface OutletTransaction {
  id: string;
  code: string | null;
  status: SubOrderStatus;
  amountMinor: number;
  items: TransactionItem[];
  createdAt: string;
}

const STATUS_STYLES: Record<SubOrderStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-100",
  ACCEPTED: "bg-blue-50 text-blue-700 ring-blue-100",
  PREPARING:
    "bg-[color-mix(in_srgb,var(--rsc-main)_10%,white)] text-[var(--rsc-main)] ring-[color-mix(in_srgb,var(--rsc-main)_20%,white)]",
  READY: "bg-purple-50 text-purple-700 ring-purple-100",
  COLLECTED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  DISPATCHED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  REJECTED: "bg-red-50 text-red-700 ring-red-100",
};

function formatNaira(minor: number) {
  if (minor === 0) return "₦0";
  return `₦${(minor / 100).toLocaleString("en-NG")}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatStatus(status: SubOrderStatus) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function describeItems(items: TransactionItem[]) {
  if (items.length === 0) return "No items available";

  return items.map((item) => `${item.quantity}× ${item.name}`).join(", ");
}

export function EarningsChart({
  dateLabel,
  transactions,
}: {
  dateLabel: string;
  transactions: OutletTransaction[];
}) {
  const statusCounts = transactions.reduce(
    (counts, order) => ({
      ...counts,
      [order.status]: (counts[order.status] ?? 0) + 1,
    }),
    {} as Partial<Record<SubOrderStatus, number>>,
  );

  return (
    <section className="rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
            Daily transaction overview
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Orders for reconciliation</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {dateLabel} outlet orders with items, amount, and status for end-of-day checks.
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-6 py-4">
        {Object.entries(statusCounts).map(([status, count]) => (
          <span
            key={status}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ring-1 ${STATUS_STYLES[status as SubOrderStatus]}`}
          >
            {formatStatus(status as SubOrderStatus)} · {count}
          </span>
        ))}
      </div>

      {transactions.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-[840px] w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-xs font-bold uppercase tracking-widest text-slate-400">
                <th className="px-6 py-4">Order</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((order) => (
                <tr key={order.id} className="align-top">
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                        <ReceiptText className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {order.code ? `Code ${order.code}` : "Outlet order"}
                        </p>
                        <p className="mt-1 max-w-[10rem] truncate font-mono text-xs text-slate-400">
                          {order.id}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-[26rem] px-6 py-4">
                    <p className="text-sm font-medium leading-6 text-slate-700">
                      {describeItems(order.items)}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-black tabular-nums text-slate-950">
                    {formatNaira(order.amountMinor)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${STATUS_STYLES[order.status]}`}
                    >
                      {formatStatus(order.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {formatDateTime(order.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <ClipboardList className="h-7 w-7" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-base font-black text-slate-900">No transactions yet</h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Orders for this outlet will appear here for reconciliation once business starts.
          </p>
        </div>
      )}
    </section>
  );
}
