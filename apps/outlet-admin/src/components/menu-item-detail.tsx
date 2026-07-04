import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import type { MenuItem } from "@rsc/contracts";
import { useMenuItem } from "../hooks/use-menu-item";
import { useDeleteMenuItem } from "../hooks/use-delete-menu-item";
import { useToggleItemAvailability } from "../hooks/use-toggle-item-availability";

function formatPrice(minor: number): string {
  return `₦${(minor / 100).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between rounded-xl border border-slate-100 bg-white px-4 py-3.5">
      <span className="shrink-0 pt-0.5 text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <div className="ml-4 text-right">{children}</div>
    </div>
  );
}

interface MenuItemDetailProps {
  itemId: string;
  outletId: string;
  categoryName?: string;
  onBack: () => void;
  onEdit: (item: MenuItem) => void;
}

export function MenuItemDetail({
  itemId,
  outletId,
  categoryName,
  onBack,
  onEdit,
}: MenuItemDetailProps) {
  const { data: item, isLoading } = useMenuItem(itemId);
  const { mutate: remove, isPending: isDeleting } = useDeleteMenuItem(outletId);
  const { mutate: toggle, isPending: isToggling } = useToggleItemAvailability(outletId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [optimisticAvail, setOptimisticAvail] = useState<boolean | null>(null);

  const isAvailable = optimisticAvail ?? item?.isAvailable ?? false;

  function handleToggle() {
    if (!item) return;
    const next = !isAvailable;
    setOptimisticAvail(next);
    toggle({ itemId: item.id, isAvailable: next }, { onError: () => setOptimisticAvail(!next) });
  }

  function handleDelete() {
    if (!item) return;
    remove(item.id, { onSuccess: onBack });
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6 h-9 w-40 animate-pulse rounded-xl bg-slate-100" />
        <div className="mb-5 h-48 animate-pulse rounded-2xl bg-slate-100" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-6 py-16 text-center">
        <p className="text-sm text-slate-400">Item not found.</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-3 text-sm font-semibold text-emerald-500 underline underline-offset-2"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50"
          aria-label="Back to menu"
        >
          <ArrowLeft size={18} />
        </button>

        <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-slate-900">{item.name}</h1>

        {!confirmDelete ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <Pencil size={12} />
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-500 shadow-sm transition hover:bg-red-100"
            >
              <Trash2 size={12} />
              Delete
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Delete this item?</span>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-600 disabled:opacity-50"
            >
              {isDeleting ? "Deleting…" : "Yes, Delete"}
            </button>
          </div>
        )}
      </div>

      {/* Image */}
      <div className="mb-5 flex min-h-44 items-center justify-center overflow-hidden rounded-2xl bg-slate-50">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="max-h-52 w-full object-contain p-4" />
        ) : (
          <div className="flex flex-col items-center gap-2 py-10 text-slate-300">
            <span className="text-6xl">🍽️</span>
            <span className="text-sm">No image uploaded</span>
          </div>
        )}
      </div>

      {/* Detail rows */}
      <div className="flex flex-col gap-3">
        <DetailRow label="Price">
          <span className="text-base font-bold text-orange-500">
            {formatPrice(item.priceMinor)}
          </span>
        </DetailRow>

        {categoryName && (
          <DetailRow label="Category">
            <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              {categoryName}
            </span>
          </DetailRow>
        )}

        {item.description && (
          <DetailRow label="Description">
            <p className="max-w-[200px] text-sm leading-snug text-slate-600">{item.description}</p>
          </DetailRow>
        )}

        <DetailRow label="Sort Order">
          <span className="text-sm text-slate-700">{item.sortOrder}</span>
        </DetailRow>

        <DetailRow label="Availability">
          <div className="flex items-center gap-2.5">
            <span
              className={`text-sm font-semibold ${isAvailable ? "text-emerald-600" : "text-slate-400"}`}
            >
              {isAvailable ? "Available" : "Unavailable"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isAvailable}
              disabled={isToggling}
              onClick={handleToggle}
              className={`relative h-7 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 disabled:opacity-50 ${
                isAvailable ? "bg-emerald-500" : "bg-slate-200"
              }`}
              style={{ width: "3.25rem" }}
            >
              <span
                className={`block h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                  isAvailable ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </DetailRow>
      </div>
    </div>
  );
}
