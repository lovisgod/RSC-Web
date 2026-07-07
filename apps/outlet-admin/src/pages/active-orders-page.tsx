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
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { KanbanColumn } from "../components/kanban-column";
import { OutletPageHeader } from "../components/outlet-page-header";
import { useAuth } from "../hooks/use-auth";
import { useNewOrderAlert } from "../hooks/use-new-order-alert";
import { useOrdersQueue } from "../hooks/use-orders-queue";
import { useUpdateOrderStatus } from "../hooks/use-update-order-status";
import {
  isActiveQueueOrder,
  riderCollect,
  verifyTakeoutHandoff,
  type PosSubOrder,
} from "../lib/api";
import { outletAdminKeys } from "../lib/query-keys";
import { toastBus } from "../lib/toast-bus";

const DRAG_TRANSITIONS: Record<string, Partial<Record<SubOrderStatus, MasterOrderStatus>>> = {
  preparing: { PENDING: "CONFIRMED" },
  ready: { ACCEPTED: "READY", PREPARING: "READY" },
};

type HandoffMode = "takeout" | "dispatch";

const HANDOFF_MODES: Record<
  HandoffMode,
  {
    label: string;
    helper: string;
    button: string;
    pending: string;
    success: string;
  }
> = {
  takeout: {
    label: "Customer pickup",
    helper: "For walk-in takeout customers",
    button: "Confirm pickup",
    pending: "Verifying…",
    success: "Customer pickup verified — order collected ✓",
  },
  dispatch: {
    label: "Rider dispatch",
    helper: "For riders collecting delivery orders",
    button: "Confirm dispatch",
    pending: "Confirming…",
    success: "Rider collection confirmed — sub-order dispatched ✓",
  },
};

function HandoffVerifier({ outletId }: { outletId: string }) {
  const [mode, setMode] = useState<HandoffMode>("takeout");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const copy = HANDOFF_MODES[mode];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (code.length !== 6) return;

    setIsSubmitting(true);
    try {
      if (mode === "takeout") {
        await verifyTakeoutHandoff({ code });
      } else {
        await riderCollect({ code });
      }

      toastBus.emit(copy.success, "success");
      setCode("");
      await queryClient.invalidateQueries({ queryKey: outletAdminKeys.orders(outletId) });
    } catch (err) {
      toastBus.emit(err instanceof Error ? err.message : "Invalid code", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-6 mb-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Code verification
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-400">{copy.helper}</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto"
      >
        <label className="sr-only" htmlFor="handoff-mode">
          Code type
        </label>
        <select
          id="handoff-mode"
          value={mode}
          onChange={(event) => {
            setMode(event.target.value as HandoffMode);
            setCode("");
          }}
          className="h-11 w-36 shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:ring-2 focus:ring-emerald-400 sm:w-44 sm:text-sm"
        >
          {Object.entries(HANDOFF_MODES).map(([value, option]) => (
            <option key={value} value={value}>
              {option.label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="handoff-code">
          {copy.label} code
        </label>
        <input
          id="handoff-code"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          placeholder="6-digit code"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          className="h-11 min-w-28 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:ring-2 focus:ring-emerald-400"
          aria-label={`${copy.label} code`}
        />

        <button
          type="submit"
          disabled={code.length !== 6 || isSubmitting}
          className="h-11 shrink-0 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50 sm:px-5"
        >
          {isSubmitting ? copy.pending : copy.button}
        </button>
      </form>
    </section>
  );
}

export function ActiveOrdersPage() {
  const { user } = useAuth();
  const outletId = user?.outletId ?? "";
  const { data: orders = [], isLoading } = useOrdersQueue(outletId);
  const { mutate: updateStatus, isPending: isAdvancing } = useUpdateOrderStatus(outletId);
  const activeOrders = orders.filter(isActiveQueueOrder);

  useNewOrderAlert(activeOrders);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const incoming = activeOrders.filter((order) => order.status === "PENDING");
  const preparing = activeOrders.filter(
    (order) => order.status === "ACCEPTED" || order.status === "PREPARING",
  );
  const ready = activeOrders.filter((order) => order.status === "READY");

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
    <div className="flex min-h-full flex-col">
      <OutletPageHeader />
      <HandoffVerifier outletId={outletId} />

      <p id="board-hint" className="mx-6 mb-3 shrink-0 text-xs text-slate-400">
        Drag a card to its next stage, or use the action button.
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div
          className="grid grid-cols-1 items-start gap-4 px-6 pb-6 lg:grid-cols-3"
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
    </div>
  );
}
