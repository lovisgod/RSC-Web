import { useState } from "react";
import type { MenuItem } from "@rsc/contracts";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { useDeleteMenuItem } from "../hooks/use-delete-menu-item";
import { useToggleItemAvailability } from "../hooks/use-toggle-item-availability";

interface MenuItemCardProps {
  item: MenuItem;
  outletId: string;
  onSelect: () => void;
  onEdit: () => void;
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
  onSelect,
  onEdit,
  dragRef,
  dragStyle,
  dragListeners,
}: MenuItemCardProps) {
  const { mutate: toggle, isPending: isToggling } = useToggleItemAvailability(outletId);
  const { mutate: remove, isPending: isDeleting } = useDeleteMenuItem(outletId);
  const [optimistic, setOptimistic] = useState(item.isAvailable);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !optimistic;
    setOptimistic(next);
    toggle({ itemId: item.id, isAvailable: next }, { onError: () => setOptimistic(!next) });
  }

  function handleDelete() {
    remove(item.id, { onSettled: () => setConfirmDelete(false) });
  }

  return (
    <div
      ref={dragRef}
      style={dragStyle}
      className="relative flex min-w-0 items-center gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm"
    >
      {/* Delete confirmation overlay */}
      {confirmDelete && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/95 px-4">
          <p className="text-center text-sm font-semibold text-slate-700">
            Delete <span className="text-red-600">{item.name}</span>?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="rounded-lg bg-red-500 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-red-600 disabled:opacity-50"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      )}

      {/* Drag grip */}
      <button
        type="button"
        {...dragListeners}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 cursor-grab touch-none text-slate-300 active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical size={16} />
      </button>

      {/* Clickable info area → opens detail screen */}
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden text-left"
      >
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-50 text-2xl">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="h-9 w-9 object-contain" />
          ) : (
            <span aria-hidden="true">🍽️</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
          <p className="mt-0.5 text-xs font-bold text-orange-500">{formatPrice(item.priceMinor)}</p>
        </div>
      </button>

      {/* Right side: toggle + edit/delete icons */}
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <button
          type="button"
          role="switch"
          aria-checked={optimistic}
          disabled={isToggling}
          onClick={handleToggle}
          className={`relative h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 disabled:opacity-50 ${
            optimistic ? "bg-emerald-500" : "bg-slate-200"
          }`}
          style={{ width: "2.75rem" }}
        >
          <span
            className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              optimistic ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
          <span className="sr-only">{optimistic ? "Mark unavailable" : "Mark available"}</span>
        </button>

        <div className="flex gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="grid h-6 w-6 place-items-center rounded-md text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
            aria-label="Edit item"
          >
            <Pencil size={12} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(true);
            }}
            className="grid h-6 w-6 place-items-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-500"
            aria-label="Delete item"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
