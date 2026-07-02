import { useState } from "react";
import type { MenuItem } from "@rsc/contracts";
import { useToggleItemAvailability } from "../hooks/use-toggle-item-availability";

interface MenuItemCardProps {
  item: MenuItem;
  outletId: string;
  dragRef?: (node: HTMLElement | null) => void;
  dragStyle?: React.CSSProperties;
  dragListeners?: React.HTMLAttributes<HTMLElement>;
}

function formatPrice(minor: number): string {
  return `₦${(minor / 100).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

export function MenuItemCard({
  item,
  outletId,
  dragRef,
  dragStyle,
  dragListeners,
}: MenuItemCardProps) {
  const { mutate: toggle, isPending } = useToggleItemAvailability(outletId);
  const [optimistic, setOptimistic] = useState(item.isAvailable);

  function handleToggle() {
    const next = !optimistic;
    setOptimistic(next);
    toggle({ itemId: item.id, isAvailable: next }, { onError: () => setOptimistic(!next) });
  }

  return (
    <div
      ref={dragRef}
      style={dragStyle}
      {...dragListeners}
      className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
    >
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-slate-50 text-3xl">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="h-10 w-10 object-contain" />
        ) : (
          <span aria-hidden="true">🍽️</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-900">{item.name}</p>
        <p className="mt-0.5 text-sm font-bold text-orange-500">{formatPrice(item.priceMinor)}</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={optimistic}
        disabled={isPending}
        onClick={handleToggle}
        className={`relative h-7 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 disabled:opacity-50 ${
          optimistic ? "bg-emerald-500" : "bg-slate-200"
        }`}
        style={{ width: "3.25rem" }}
      >
        <span
          className={`block h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
            optimistic ? "translate-x-6" : "translate-x-0.5"
          }`}
        />
        <span className="sr-only">{optimistic ? "Mark unavailable" : "Mark available"}</span>
      </button>
    </div>
  );
}
