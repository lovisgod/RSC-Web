import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { MasterOrderStatus, SubOrderStatus } from "@rsc/contracts";
import { useState } from "react"; // kept for TakeoutVerifier

import { KanbanColumn } from "../components/kanban-column";
import { OutletPageHeader } from "../components/outlet-page-header";
import { useAuth } from "../hooks/use-auth";
import { useNewOrderAlert } from "../hooks/use-new-order-alert";
import { useOrdersQueue } from "../hooks/use-orders-queue";
import { useUpdateOrderStatus } from "../hooks/use-update-order-status";
import { verifyHandoffCode, type PosSubOrder } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

// ─── Allowed drag transitions ─────────────────────────────────────────────────
const DRAG_TRANSITIONS: Record<string, Partial<Record<SubOrderStatus, MasterOrderStatus>>> = {
  preparing: { PENDING: "CONFIRMED" },
  ready: { ACCEPTED: "READY", PREPARING: "READY" },
};

// ─── Accept + prep-time modal (commented out — API does not accept preparationTimeMinutes yet) ───
/*
function AcceptOrderModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (prepTimeMinutes: number) => void;
  onCancel: () => void;
}) {
  const [minutes, setMinutes] = useState(25);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-slate-900">
          Accept Order &amp; Set Preparation Time
        </h2>
        <p className="mt-1.5 text-sm text-slate-500">
          Estimate how long (in minutes) this sub-order will take to be cooked &amp; packaged.
        </p>

        <div className="mt-5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Preparation Time (Minutes)
          </label>
          <input
            type="number"
            min={1}
            max={240}
            value={minutes}
            onChange={(e) => setMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
            autoFocus
          />
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(minutes)}
            className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
*/

// ─── Takeout hand-off verifier ────────────────────────────────────────────────

function TakeoutVerifier({ outletId }: { outletId: string }) {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (code.length !== 6 || !outletId) return;
    setIsVerifying(true);
    try {
      await verifyHandoffCode(outletId, { code });
      toastBus.emit("Handoff verified — order collected ✓", "success");
      setCode("");
    } catch (err) {
      toastBus.emit(err instanceof Error ? err.message : "Invalid code", "error");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="mx-6 mb-5 flex items-center gap-4 rounded-xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
      <span className="text-2xl" aria-hidden="true">
        🛍️
      </span>
      <span className="shrink-0 text-sm font-semibold text-slate-700">
        Takeout Hand-off Verifier
      </span>
      <form onSubmit={handleVerify} className="flex flex-1 items-center gap-3">
        <input
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          placeholder="Enter customer's 6-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-emerald-400"
        />
        <button
          type="submit"
          disabled={code.length !== 6 || isVerifying || !outletId}
          className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
        >
          Verify Code
        </button>
      </form>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ActiveOrdersPage() {
  const { user } = useAuth();
  const outletId = user?.outletId ?? "";
  const { data: orders = [], isLoading } = useOrdersQueue(outletId);
  const { mutate: updateStatus, isPending: isAdvancing } = useUpdateOrderStatus(outletId);

  useNewOrderAlert(orders);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const incoming = orders.filter((o) => o.status === "PENDING");
  const preparing = orders.filter((o) => o.status === "ACCEPTED" || o.status === "PREPARING");
  const ready = orders.filter((o) => o.status === "READY");

  function handleAdvance(subOrderId: string, status: MasterOrderStatus) {
    updateStatus({ subOrderId, status });
  }

  function handleDragEnd(event: DragEndEvent) {
    const targetColumn = event.over?.id as string | undefined;
    const order = event.active.data.current?.order as PosSubOrder | undefined;
    if (!order || !targetColumn) return;

    const transitions = DRAG_TRANSITIONS[targetColumn];
    const nextStatus = transitions?.[order.status] ?? null;

    if (!nextStatus) {
      toastBus.emit("That move is not allowed", "warning");
      return;
    }

    updateStatus({ subOrderId: order.id, status: nextStatus });
  }

  return (
    <div className="flex h-full min-h-screen flex-col">
      <OutletPageHeader />
      <TakeoutVerifier outletId={outletId} />

      <p id="board-hint" className="mx-6 mb-3 text-xs text-slate-400">
        Drag a card to its next stage, or use the action button.
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div
          className="grid flex-1 grid-cols-1 gap-4 px-6 pb-6 lg:grid-cols-3"
          style={{ minHeight: 0 }}
          aria-describedby="board-hint"
        >
          <KanbanColumn
            id="incoming"
            title="Incoming"
            badge={incoming.length}
            badgeColor="bg-orange-500"
            orders={incoming}
            isLoading={isLoading}
            emptyText="No incoming orders"
            onAdvance={handleAdvance}
            isAdvancing={isAdvancing}
          />
          <KanbanColumn
            id="preparing"
            title="Outlet Preparing"
            badge={preparing.length}
            badgeColor="bg-orange-500"
            orders={preparing}
            isLoading={isLoading}
            emptyText="No items in preparation"
            onAdvance={handleAdvance}
            isAdvancing={isAdvancing}
          />
          <KanbanColumn
            id="ready"
            title="Ready for Collection"
            badge={ready.length}
            badgeColor="bg-emerald-500"
            orders={ready}
            isLoading={isLoading}
            emptyText="No ready orders"
            onAdvance={handleAdvance}
            isAdvancing={isAdvancing}
          />
        </div>
      </DndContext>

      {/* AcceptOrderModal commented out — API does not support preparationTimeMinutes yet */}
    </div>
  );
}
