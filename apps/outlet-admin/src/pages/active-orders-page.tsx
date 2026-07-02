import type { SubOrderStatus } from "@rsc/contracts";
import { useState } from "react";

import { KanbanColumn } from "../components/kanban-column";
import { OutletPageHeader } from "../components/outlet-page-header";
import { useAuth } from "../hooks/use-auth";
import { useOrdersQueue } from "../hooks/use-orders-queue";
import { useUpdateOrderStatus } from "../hooks/use-update-order-status";
import { http } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

// ─── Takeout hand-off verifier ────────────────────────────────────────────────

function TakeoutVerifier({ outletId }: { outletId: string }) {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6 || !outletId) return;
    setIsVerifying(true);
    try {
      await http.post(`/api/v1/outlets/${outletId}/orders/verify-handoff`, { code });
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

  const incoming = orders.filter((o) => o.status === "PENDING");
  const preparing = orders.filter((o) => o.status === "ACCEPTED" || o.status === "PREPARING");
  const ready = orders.filter((o) => o.status === "READY");

  function handleAdvance(subOrderId: string, status: SubOrderStatus) {
    updateStatus({ subOrderId, status });
  }

  return (
    <div className="flex h-full min-h-screen flex-col">
      <OutletPageHeader />
      <TakeoutVerifier outletId={outletId} />

      <div className="grid flex-1 grid-cols-3 gap-4 px-6 pb-6" style={{ minHeight: 0 }}>
        <KanbanColumn
          title="Incoming Sub-Orders"
          badge={incoming.length}
          badgeColor="bg-orange-500"
          orders={incoming}
          isLoading={isLoading}
          emptyText="No incoming sub-orders"
          onAdvance={handleAdvance}
          isAdvancing={isAdvancing}
        />
        <KanbanColumn
          title="Kitchen Preparing"
          badge={preparing.length}
          badgeColor="bg-orange-500"
          orders={preparing}
          isLoading={isLoading}
          emptyText="No items in preparation"
          onAdvance={handleAdvance}
          isAdvancing={isAdvancing}
        />
        <KanbanColumn
          title="Ready for Collection"
          badge={ready.length}
          badgeColor="bg-emerald-500"
          orders={ready}
          isLoading={isLoading}
          emptyText="No ready orders in queue"
          onAdvance={handleAdvance}
          isAdvancing={isAdvancing}
        />
      </div>
    </div>
  );
}
