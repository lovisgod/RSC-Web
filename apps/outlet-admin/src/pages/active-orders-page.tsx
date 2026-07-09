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
    pending: string;
    success: string;
  }
> = {
  takeout: {
    pending: "Confirming pickup...",
    success: "Customer pickup verified - order collected",
  },
  dispatch: {
    pending: "Confirming handoff...",
    success: "Rider handoff confirmed - sub-order dispatched",
  },
};

const DELIVERY_MODE_LABEL: Record<string, string> = {
  DELIVERY: "Delivery",
  TAKEOUT: "Takeout",
};

function HandoffVerifier({
  outletId,
  readyOrders,
}: {
  outletId: string;
  readyOrders: PosSubOrder[];
}) {
  const [code, setCode] = useState("");
  const [submittingMode, setSubmittingMode] = useState<HandoffMode | null>(null);
  const queryClient = useQueryClient();
  const matchedOrder =
    code.length === 6 ? readyOrders.find((order) => order.pickupCode === code) : undefined;
  const hasPickupCodes = readyOrders.some((order) => order.pickupCode);

  async function confirmHandoff(mode: HandoffMode) {
    if (!matchedOrder || submittingMode) return;

    const copy = HANDOFF_MODES[mode];
    setSubmittingMode(mode);
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
      setSubmittingMode(null);
    }
  }

  const codeIsComplete = code.length === 6;
  const notFound = codeIsComplete && hasPickupCodes && !matchedOrder;
  const pickupCodesUnavailable = codeIsComplete && !hasPickupCodes;

  return (
    <section className="mx-6 mb-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Code verification
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-400">
            Enter the pickup code first; confirm only after the matching sub-order card appears.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="sr-only" htmlFor="handoff-code">
          Pickup code
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
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:ring-2 focus:ring-emerald-400"
          aria-label="Pickup code"
        />

        {matchedOrder && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm font-bold text-slate-900">
                  #{matchedOrder.id.slice(-8).toUpperCase()}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {DELIVERY_MODE_LABEL[matchedOrder.deliveryMode] ?? matchedOrder.deliveryMode} -{" "}
                  {matchedOrder.items.length} item{matchedOrder.items.length === 1 ? "" : "s"} - NGN{" "}
                  {(matchedOrder.totalAmountMinor / 100).toLocaleString("en-NG")}
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-emerald-700">
                {matchedOrder.status}
              </span>
            </div>

            <ul className="mt-3 space-y-1 border-t border-emerald-100 pt-3">
              {matchedOrder.items.slice(0, 3).map((item, index) => (
                <li key={`${item.name}-${index}`} className="text-xs text-slate-600">
                  <span className="font-bold text-orange-500">{item.quantity}x</span> {item.name}
                </li>
              ))}
              {matchedOrder.items.length > 3 && (
                <li className="text-xs text-slate-400">
                  +{matchedOrder.items.length - 3} more item
                  {matchedOrder.items.length - 3 === 1 ? "" : "s"}
                </li>
              )}
            </ul>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={Boolean(submittingMode)}
                onClick={() => void confirmHandoff("takeout")}
                className="h-10 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
              >
                {submittingMode === "takeout"
                  ? HANDOFF_MODES.takeout.pending
                  : "Confirm customer pickup"}
              </button>
              <button
                type="button"
                disabled={Boolean(submittingMode)}
                onClick={() => void confirmHandoff("dispatch")}
                className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
              >
                {submittingMode === "dispatch"
                  ? HANDOFF_MODES.dispatch.pending
                  : "Confirm rider handoff"}
              </button>
            </div>
          </div>
        )}

        {notFound && (
          <p className="text-xs font-medium text-red-500">
            No ready sub-order in this outlet matches that pickup code.
          </p>
        )}

        {pickupCodesUnavailable && (
          <p className="text-xs font-medium text-amber-600">
            Pickup codes are not present in the outlet order list response, so the card cannot be
            previewed before confirmation. The backend needs to expose a code lookup endpoint or
            include pickupCode in admin sub-orders.
          </p>
        )}
      </div>
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
  const preparing = activeOrders
    .filter((order) => order.status === "ACCEPTED" || order.status === "PREPARING")
    .sort(
      (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    );
  const ready = activeOrders.filter((order) => order.status === "READY");

  function handleAdvance(
    subOrderId: string,
    status: MasterOrderStatus,
    preparationTimeMinutes?: number,
    rejectionReason?: string,
  ) {
    updateStatus({
      subOrderId,
      status,
      ...(preparationTimeMinutes !== undefined ? { preparationTimeMinutes } : {}),
      ...(rejectionReason !== undefined ? { rejectionReason } : {}),
    });
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
      <HandoffVerifier outletId={outletId} readyOrders={ready} />

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
