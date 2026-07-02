import type { SubOrderStatus } from "@rsc/contracts";
import type { PosSubOrder } from "../lib/api";
import { KanbanCard } from "./kanban-card";

interface KanbanColumnProps {
  title: string;
  badge: number;
  badgeColor: string;
  orders: PosSubOrder[];
  isLoading: boolean;
  emptyText: string;
  onAdvance: (id: string, status: SubOrderStatus) => void;
  isAdvancing: boolean;
}

export function KanbanColumn({
  title,
  badge,
  badgeColor,
  orders,
  isLoading,
  emptyText,
  onAdvance,
  isAdvancing,
}: KanbanColumnProps) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-100 bg-slate-50">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{title}</span>
        <span
          className={`grid h-5 min-w-[1.25rem] place-items-center rounded-full px-1.5 text-xs font-bold text-white ${badgeColor}`}
        >
          {badge}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {isLoading ? (
          <>
            <div className="h-24 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-24 animate-pulse rounded-xl bg-slate-200" />
          </>
        ) : orders.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">{emptyText}</p>
        ) : (
          orders.map((order) => (
            <KanbanCard
              key={order.id}
              order={order}
              onAdvance={onAdvance}
              isAdvancing={isAdvancing}
            />
          ))
        )}
      </div>
    </div>
  );
}
