import type { SubOrderStatus } from "@rsc/contracts";
import type { PosSubOrder } from "../lib/api";

const NEXT_STATUS: Partial<Record<string, SubOrderStatus>> = {
  PENDING: "ACCEPTED",
  ACCEPTED: "PREPARING",
  PREPARING: "READY",
  READY: "COLLECTED",
};

const NEXT_LABEL: Partial<Record<string, string>> = {
  PENDING: "Accept",
  ACCEPTED: "Prepare",
  PREPARING: "Mark Ready",
  READY: "Collected",
};

interface KanbanCardProps {
  order: PosSubOrder;
  onAdvance: (id: string, status: SubOrderStatus) => void;
  isAdvancing: boolean;
}

export function KanbanCard({ order, onAdvance, isAdvancing }: KanbanCardProps) {
  const nextStatus = NEXT_STATUS[order.status] ?? null;
  const nextLabel = NEXT_LABEL[order.status] ?? "Advance";

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-slate-500">
          #{order.id.slice(-6).toUpperCase()}
        </span>
        <span className="text-xs text-slate-400">
          {new Date(order.createdAt).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      <ul className="mb-2 space-y-0.5">
        {order.items.map((item, i) => (
          <li key={i} className="text-sm text-slate-700">
            <span className="font-medium">{item.quantity}×</span> {item.name}
          </li>
        ))}
      </ul>

      {order.customerNote && (
        <p className="mb-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
          {order.customerNote}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-slate-50 pt-2">
        <span className="text-sm font-bold text-slate-900">
          ₦{(order.totalAmountMinor / 100).toLocaleString("en-NG")}
        </span>
        {nextStatus && (
          <button
            type="button"
            disabled={isAdvancing}
            onClick={() => onAdvance(order.id, nextStatus)}
            className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
          >
            → {nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}
