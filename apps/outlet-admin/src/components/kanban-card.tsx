import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { MasterOrderStatus, SubOrderStatus } from "@rsc/contracts";
import { GripVertical } from "lucide-react";
import { useState } from "react";
import { printReceipt } from "../lib/native-bridge";
import type { PosSubOrder } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

// ─── Constants ────────────────────────────────────────────────────────────────

const NEXT_STATUS: Partial<Record<SubOrderStatus, MasterOrderStatus>> = {
  PENDING: "CONFIRMED",
  ACCEPTED: "PARTIALLY_READY",
  PREPARING: "READY",
  READY: "DELIVERED",
};

const DELIVERY_MODE_LABEL: Record<string, string> = {
  DELIVERY: "Delivery",
  TAKEOUT: "Takeout",
};

const DELIVERY_MODE_EMOJI: Record<string, string> = {
  DELIVERY: "🚴",
  TAKEOUT: "🛍️",
};

// ─── Compact item list ────────────────────────────────────────────────────────

function ItemList({ items }: { items: PosSubOrder["items"] }) {
  return (
    <ul className="mb-2.5 space-y-1.5">
      {items.map((item, i) => (
        <li key={i}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-bold text-orange-500">{item.quantity}×</span>
            <span className="text-xs font-semibold text-slate-600">
              ₦{((item.quantity * item.priceMinor) / 100).toLocaleString("en-NG")}
            </span>
          </div>
          <p className="text-sm text-slate-800">{item.name}</p>
        </li>
      ))}
    </ul>
  );
}

// ─── Expanded order detail ────────────────────────────────────────────────────

function OrderDetailPanel({ order }: { order: PosSubOrder }) {
  return (
    <div className="mb-2.5 space-y-2.5 rounded-lg bg-slate-50 p-2.5">
      {order.items.map((item, i) => (
        <div key={i}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-bold text-orange-500">{item.quantity}×</span>
            <span className="min-w-0 flex-1 text-xs font-semibold text-slate-800">{item.name}</span>
            <span className="shrink-0 text-xs font-bold text-slate-600">
              ₦{((item.quantity * item.priceMinor) / 100).toLocaleString("en-NG")}
            </span>
          </div>
          {item.modifiers && item.modifiers.length > 0 && (
            <ul className="ml-3 mt-1 space-y-0.5">
              {item.modifiers.map((mod, j) => (
                <li key={j} className="flex items-baseline gap-1.5 text-xs text-slate-500">
                  <span className="shrink-0 text-slate-400">+</span>
                  <span className="flex-1">{mod.name}</span>
                  {mod.priceDeltaMinor > 0 && (
                    <span className="shrink-0 text-slate-400">
                      +₦{(mod.priceDeltaMinor / 100).toLocaleString("en-NG")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {/* Total + delivery code */}
      <div className="space-y-1 border-t border-slate-200 pt-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total</span>
          <span className="text-xs font-bold text-slate-800">
            ₦{(order.totalAmountMinor / 100).toLocaleString("en-NG")}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Mode</span>
          <span className="text-xs font-medium text-slate-600">
            {DELIVERY_MODE_EMOJI[order.deliveryMode] ?? "📦"}{" "}
            {DELIVERY_MODE_LABEL[order.deliveryMode] ?? order.deliveryMode}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Shared drag shell ────────────────────────────────────────────────────────

interface ShellProps {
  order: PosSubOrder;
  isAdvancing: boolean;
  accentClass?: string;
  rightSlot?: React.ReactNode;
  children?: React.ReactNode;
}

function CardShell({ order, isAdvancing, accentClass, rightSlot, children }: ShellProps) {
  const { attributes, isDragging, listeners, setNodeRef, transform } = useDraggable({
    id: order.id,
    data: { order },
    disabled: isAdvancing,
  });
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm ${isDragging ? "opacity-50 shadow-lg" : ""}`}
    >
      <div className="flex">
        {accentClass && <div className={`w-1 shrink-0 ${accentClass}`} />}
        <div className="flex-1 p-3">
          {/* Header */}
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1">
              <button
                type="button"
                className={`grid h-6 w-5 shrink-0 cursor-grab place-items-center rounded active:cursor-grabbing disabled:cursor-not-allowed ${
                  expanded
                    ? "bg-slate-100 text-slate-600"
                    : "text-slate-300 hover:bg-slate-100 hover:text-slate-500"
                }`}
                disabled={isAdvancing}
                aria-label={expanded ? "Collapse order details" : "Show order details"}
                onClick={() => setExpanded((v) => !v)}
                {...listeners}
                {...attributes}
              >
                <GripVertical size={13} aria-hidden="true" />
              </button>
              <span className="font-mono text-xs font-bold text-slate-800">
                #{order.id.slice(-8).toUpperCase()}
              </span>
            </div>
            <div className="shrink-0">
              {rightSlot ?? (
                <span className="text-xs text-slate-400">
                  {new Date(order.createdAt).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Item list: compact or detailed */}
          {expanded ? <OrderDetailPanel order={order} /> : <ItemList items={order.items} />}

          {/* Action footer */}
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Public interface ─────────────────────────────────────────────────────────

interface KanbanCardProps {
  order: PosSubOrder;
  onAdvance: (subOrderId: string, status: MasterOrderStatus) => void;
  isAdvancing: boolean;
}

// ─── Incoming card (PENDING) ──────────────────────────────────────────────────

function IncomingCard({ order, onAdvance, isAdvancing }: KanbanCardProps) {
  return (
    <CardShell order={order} isAdvancing={isAdvancing} accentClass="bg-orange-500">
      <div className="flex items-center justify-between gap-2 border-t border-slate-50 pt-2">
        <button
          type="button"
          disabled={isAdvancing}
          onClick={() => onAdvance(order.id, "CANCELLED")}
          className="rounded-lg border border-red-600 bg-[var(--rsc-danger)] px-3 py-1 text-xs font-semibold text-[var(--rsc-panel)] transition hover:bg-red-100 disabled:opacity-50"
        >
          Reject
        </button>
        <button
          type="button"
          disabled={isAdvancing}
          onClick={() => onAdvance(order.id, "CONFIRMED")}
          className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
        >
          Accept
        </button>
      </div>
    </CardShell>
  );
}

// ─── Kitchen card (ACCEPTED / PREPARING) ─────────────────────────────────────

function KitchenCard({ order, onAdvance, isAdvancing }: KanbanCardProps) {
  async function handlePrint() {
    const result = await printReceipt({
      orderId: order.id,
      title: `Order #${order.id.slice(-8).toUpperCase()}`,
      lines: order.items.map((item) => ({
        label: item.name,
        quantity: item.quantity,
        amountMinor: item.priceMinor,
      })),
      totalMinor: order.totalAmountMinor,
      currency: "NGN",
    });
    if (!result.printed) toastBus.emit("Printing unavailable outside POS shell", "warning");
  }

  const targetSlot = order.estimatedPrepTimeMinutes != null && (
    <span className="text-xs text-slate-400">
      Target:{" "}
      <span className="font-semibold text-slate-600">{order.estimatedPrepTimeMinutes}m</span>
    </span>
  );

  return (
    <CardShell
      order={order}
      isAdvancing={isAdvancing}
      accentClass="bg-yellow-400"
      rightSlot={targetSlot || undefined}
    >
      <div className="flex items-center gap-2 border-t border-slate-50 pt-2">
        <button
          type="button"
          onClick={handlePrint}
          className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          🖨️ Print
        </button>
        <button
          type="button"
          disabled={isAdvancing}
          onClick={() => onAdvance(order.id, NEXT_STATUS.PREPARING!)}
          className="flex-1 rounded-lg bg-slate-900 px-2 py-1 text-xs font-bold text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          Mark Ready
        </button>
      </div>
    </CardShell>
  );
}

// ─── Ready card ───────────────────────────────────────────────────────────────

const READY_ACTION_LABEL: Record<string, string> = {
  DELIVERY: "Rider Handoff",
  TAKEOUT: "Customer Pickup",
};

function ReadyCard({ order, onAdvance, isAdvancing }: KanbanCardProps) {
  const badge = (
    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-emerald-600">
      Ready
    </span>
  );

  const actionLabel = READY_ACTION_LABEL[order.deliveryMode] ?? "Complete";

  return (
    <CardShell
      order={order}
      isAdvancing={isAdvancing}
      accentClass="bg-emerald-500"
      rightSlot={badge}
    >
      <div className="flex items-center justify-between gap-2 border-t border-slate-50 pt-2">
        <p className="text-xs font-medium text-slate-500">
          {DELIVERY_MODE_EMOJI[order.deliveryMode] ?? "📦"}{" "}
          {DELIVERY_MODE_LABEL[order.deliveryMode] ?? order.deliveryMode}
        </p>
        <button
          type="button"
          disabled={isAdvancing}
          onClick={() => onAdvance(order.id, "DELIVERED")}
          className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
        >
          {actionLabel}
        </button>
      </div>
    </CardShell>
  );
}

// ─── Unified export ───────────────────────────────────────────────────────────

export function KanbanCard({ order, onAdvance, isAdvancing }: KanbanCardProps) {
  if (order.status === "ACCEPTED" || order.status === "PREPARING") {
    return <KitchenCard order={order} onAdvance={onAdvance} isAdvancing={isAdvancing} />;
  }
  if (order.status === "READY") {
    return <ReadyCard order={order} onAdvance={onAdvance} isAdvancing={isAdvancing} />;
  }
  return <IncomingCard order={order} onAdvance={onAdvance} isAdvancing={isAdvancing} />;
}
