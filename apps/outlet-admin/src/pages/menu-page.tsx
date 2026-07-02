import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { MenuItem } from "@rsc/contracts";
import { useMemo, useRef, useState } from "react";

import { MenuItemCard } from "../components/menu-item-card";
import { useAuth } from "../hooks/use-auth";
import { useCreateMenuItem } from "../hooks/use-create-menu-item";
import { useMenuCategories, useMenuItems } from "../hooks/use-menu-items";

const EMPTY_MENU_ITEMS: MenuItem[] = [];

// ─── Sortable wrapper ─────────────────────────────────────────────────────────

function SortableMenuItemCard({ item, outletId }: { item: MenuItem; outletId: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <MenuItemCard
      item={item}
      outletId={outletId}
      dragRef={setNodeRef}
      dragStyle={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        cursor: "grab",
      }}
      dragListeners={{ ...attributes, ...listeners } as React.HTMLAttributes<HTMLElement>}
    />
  );
}

// ─── Category tab button ──────────────────────────────────────────────────────

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-slate-900 text-white"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Add item form field ──────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</label>
      {children}
    </div>
  );
}

// ─── Add new item modal ───────────────────────────────────────────────────────

function AddItemModal({
  outletId,
  categories,
  onClose,
}: {
  outletId: string;
  categories: { id: string; name: string }[];
  onClose: () => void;
}) {
  const { mutate: createItem, isPending } = useCreateMenuItem(outletId);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [emoji, setEmoji] = useState("🍽️");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceMinor = Math.round(parseFloat(price) * 100);
    if (!name.trim() || isNaN(priceMinor) || priceMinor <= 0 || !categoryId) return;
    createItem(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        priceMinor,
        categoryId,
        emoji,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-5 text-lg font-bold text-slate-900">Add New Menu Item</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Item Emoji">
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xl outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="🍽️"
            />
          </FormField>

          <FormField label="Item Name">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grilled Ribs"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </FormField>

          <FormField label="Description">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter short recipe info"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </FormField>

          <FormField label="Price (₦)">
            <input
              type="number"
              required
              min={1}
              step={50}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 4500"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </FormField>

          <FormField label="Category">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {categories.length === 0 && <option value="">No categories yet</option>}
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </FormField>

          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim() || !price || !categoryId}
              className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
            >
              {isPending ? "Creating…" : "Create Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function MenuPage() {
  const { user } = useAuth();
  const outletId = user?.outletId ?? "";
  const { data: categories = [] } = useMenuCategories(outletId);
  const [activeCategoryId, setActiveCategoryId] = useState<string | undefined>();
  const { data: menuItems, isLoading } = useMenuItems(outletId, activeCategoryId);
  const serverItems = menuItems ?? EMPTY_MENU_ITEMS;
  const sortKey = activeCategoryId ?? "all";
  const [itemOrderByCategory, setItemOrderByCategory] = useState<Record<string, string[]>>({});
  const [showAddModal, setShowAddModal] = useState(false);

  const sortedItems = useMemo(() => {
    const preferredOrder = itemOrderByCategory[sortKey];
    if (!preferredOrder) return serverItems;

    const itemsById = new Map(serverItems.map((item) => [item.id, item]));
    const orderedItems = preferredOrder.flatMap((itemId) => {
      const item = itemsById.get(itemId);
      return item ? [item] : [];
    });
    const orderedIds = new Set(preferredOrder);
    const newItems = serverItems.filter((item) => !orderedIds.has(item.id));

    return [...orderedItems, ...newItems];
  }, [itemOrderByCategory, serverItems, sortKey]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedItems.findIndex((item) => item.id === active.id);
    const newIndex = sortedItems.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const nextItems = arrayMove(sortedItems, oldIndex, newIndex);
    setItemOrderByCategory((current) => ({
      ...current,
      [sortKey]: nextItems.map((item) => item.id),
    }));
    // TODO: persist via PATCH .../menu/items/reorder when endpoint is ready
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Menu &amp; Inventory Manager</h1>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
        >
          + Add New Item
        </button>
      </div>

      {categories.length > 0 && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          <TabButton
            label="All"
            active={!activeCategoryId}
            onClick={() => setActiveCategoryId(undefined)}
          />
          {categories.map((cat) => (
            <TabButton
              key={cat.id}
              label={cat.name}
              active={activeCategoryId === cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
            />
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-400">No items in this category.</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={sortedItems.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-2 gap-4">
              {sortedItems.map((item) => (
                <SortableMenuItemCard key={item.id} item={item} outletId={outletId} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {showAddModal && (
        <AddItemModal
          outletId={outletId}
          categories={categories}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
