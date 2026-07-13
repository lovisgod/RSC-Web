import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { MasterOrderStatus, SubOrderStatus } from "@rsc/contracts";
import { GripVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { printReceipt } from "../lib/native-bridge";
import type { PosSubOrder } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

// ─── Constants ────────────────────────────────────────────────────────────────

const NEXT_STATUS: Partial<Record<SubOrderStatus, MasterOrderStatus>> = {
  PENDING: "CONFIRMED",
  ACCEPTED: "PREPARING",
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

const FIFTEEN_MINUTES_IN_SECONDS = 15 * 60;
const FIVE_MINUTES_IN_SECONDS = 5 * 60;

function formatCountdown(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getCountdownTone(secondsRemaining: number): string {
  if (secondsRemaining <= FIVE_MINUTES_IN_SECONDS) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (secondsRemaining <= FIFTEEN_MINUTES_IN_SECONDS) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function PrepCountdown({ order }: { order: PosSubOrder }) {
  const [now, setNow] = useState(() => Date.now());
  const prepMinutes = order.estimatedPrepTimeMinutes;

  useEffect(() => {
    if (prepMinutes == null) return undefined;

    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [prepMinutes]);

  if (prepMinutes == null) return null;

  const rawStartedAt = new Date(order.updatedAt || order.createdAt).getTime();
  const startedAt = Number.isFinite(rawStartedAt) ? rawStartedAt : now;
  const endsAt = startedAt + prepMinutes * 60_000;
  const secondsRemaining = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const isOverdue = now > endsAt;

  return (
    <span
      className={`inline-flex min-w-[4.5rem] items-center justify-center rounded-full border px-2 py-0.5 text-xs font-bold tabular-nums ${getCountdownTone(secondsRemaining)}`}
      title={
        isOverdue
          ? `Prep target passed (${prepMinutes} minutes)`
          : `Estimated prep time: ${prepMinutes} minutes`
      }
    >
      {formatCountdown(secondsRemaining)}
    </span>
  );
}

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
          {item.customerNote && (
            <p className="mt-0.5 rounded-md bg-slate-50 px-2 py-1 text-xs italic text-slate-500">
              Note: {item.customerNote}
            </p>
          )}
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
          {item.customerNote && (
            <p className="ml-3 mt-1 rounded-md bg-white px-2 py-1 text-xs italic text-slate-500">
              Note: {item.customerNote}
            </p>
          )}
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
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total SubOrders
          </span>
          <span className="text-xs font-bold text-slate-800">{order.totalSubOrders}</span>
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

          {order.preparationNote && (
            <div className="mb-2 rounded-lg border border-orange-100 bg-orange-50 px-2.5 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-orange-500">
                Preparation note
              </p>
              <p className="mt-0.5 text-xs font-medium leading-relaxed text-slate-700">
                {order.preparationNote}
              </p>
            </div>
          )}

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
  onAdvance: (
    subOrderId: string,
    status: MasterOrderStatus,
    preparationTimeMinutes?: number,
    rejectionReason?: string,
  ) => void;
  isAdvancing: boolean;
}

// ─── Incoming card (PENDING) ──────────────────────────────────────────────────

function IncomingCard({ order, onAdvance, isAdvancing }: KanbanCardProps) {
  const [preparationTimeMinutes, setPreparationTimeMinutes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const parsedPreparationTime = Number(preparationTimeMinutes);
  const canAccept =
    Number.isInteger(parsedPreparationTime) &&
    parsedPreparationTime > 0 &&
    parsedPreparationTime <= 240;

  function handleReject() {
    const trimmedReason = rejectReason.trim();
    if (!trimmedReason) {
      toastBus.emit("Please provide a rejection reason", "warning");
      return;
    }

    setShowRejectModal(false);
    setRejectReason("");
    onAdvance(order.id, "CANCELLED", undefined, trimmedReason);
  }

  return (
    <CardShell order={order} isAdvancing={isAdvancing} accentClass="bg-orange-500">
      <div className="space-y-2 border-t border-slate-50 pt-2">
        {showRejectModal && (
          <div className="rounded-xl border border-red-200 bg-red-50/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
              Rejection reason
            </p>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Briefly explain why this order cannot be fulfilled"
              className="mt-2 min-h-20 w-full rounded-lg border border-red-200 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-red-300"
              maxLength={500}
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white"
              >
                Confirm reject
              </button>
            </div>
          </div>
        )}

        {!showRejectModal && (
          <>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Estimated prep time
              </span>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={240}
                  value={preparationTimeMinutes}
                  onChange={(event) =>
                    setPreparationTimeMinutes(event.target.value.replace(/\D/g, ""))
                  }
                  placeholder="20"
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-300"
                />
                <span className="shrink-0 text-xs font-semibold text-slate-400">mins</span>
              </div>
            </label>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={isAdvancing}
                onClick={() => setShowRejectModal(true)}
                className="rounded-lg border border-red-600 bg-[var(--rsc-danger)] px-3 py-1 text-xs font-semibold text-[var(--rsc-panel)] transition hover:bg-red-100 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                type="button"
                disabled={isAdvancing || !canAccept}
                onClick={() => onAdvance(order.id, "CONFIRMED", parsedPreparationTime)}
                className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
              >
                Accept
              </button>
            </div>
          </>
        )}
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

  const targetSlot = <PrepCountdown order={order} />;

  return (
    <CardShell
      order={order}
      isAdvancing={isAdvancing}
      accentClass="bg-yellow-400"
      rightSlot={targetSlot}
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
