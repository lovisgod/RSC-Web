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
import { MenuItemDetail } from "../components/menu-item-detail";
import { useAuth } from "../hooks/use-auth";
import { useCreateMenuItem } from "../hooks/use-create-menu-item";
import { useItemModifierGroups } from "../hooks/use-item-modifier-groups";
import { useMenuCategories, useMenuItems } from "../hooks/use-menu-items";
import { useUpdateMenuItem } from "../hooks/use-update-menu-item";

const EMPTY_MENU_ITEMS: MenuItem[] = [];

// ─── Sortable wrapper ─────────────────────────────────────────────────────────

function SortableMenuItemCard({
  item,
  outletId,
  onSelect,
  onEdit,
}: {
  item: MenuItem;
  outletId: string;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <MenuItemCard
      item={item}
      outletId={outletId}
      onSelect={onSelect}
      onEdit={onEdit}
      dragRef={setNodeRef}
      dragStyle={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
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
  const { data: modifierGroups = [] } = useItemModifierGroups(outletId);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [deliveryTimeRange, setDeliveryTimeRange] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [isAvailable, setIsAvailable] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");
  const [selectedModifierGroupIds, setSelectedModifierGroupIds] = useState<string[]>([]);
  const [shaking, setShaking] = useState(false);

  function triggerShake() {
    setShaking(true);
    setTimeout(() => setShaking(false), 450);
  }

  function toggleModifierGroup(id: string) {
    setSelectedModifierGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceMinor = Math.round(parseFloat(price) * 100);
    if (!name.trim() || isNaN(priceMinor) || priceMinor <= 0 || !categoryId) {
      triggerShake();
      return;
    }
    createItem(
      {
        body: {
          outletId,
          categoryId,
          name: name.trim(),
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(deliveryTimeRange.trim() ? { deliveryTimeRange: deliveryTimeRange.trim() } : {}),
          priceMinor,
          isAvailable,
          sortOrder: parseInt(sortOrder, 10) || 0,
          ...(selectedModifierGroupIds.length > 0
            ? { modifierGroupIds: selectedModifierGroupIds }
            : {}),
        },
        ...(imageFile ? { imageFile } : {}),
      },
      {
        onSuccess: onClose,
        onError: triggerShake,
      },
    );
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div
        className={`flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl ${shaking ? "animate-shake" : ""}`}
      >
        <div className="relative border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-bold text-slate-900">Add New Menu Item</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto px-6 py-5">
          <FormField label="Item Name *">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jollof Rice"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </FormField>

          <FormField label="Description">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of the item"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </FormField>

          <FormField label="Item Image">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm transition hover:border-emerald-400 hover:bg-emerald-50/30">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
              {imageFile ? (
                <div className="flex w-full items-center gap-3">
                  <img
                    src={URL.createObjectURL(imageFile)}
                    alt="preview"
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                  <span className="min-w-0 flex-1 truncate text-slate-700">{imageFile.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setImageFile(null);
                    }}
                    className="shrink-0 text-xs text-slate-400 hover:text-red-500"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-2xl">🖼️</span>
                  <span className="text-slate-500">Click to upload image</span>
                  <span className="text-xs text-slate-400">PNG, JPG, WEBP</span>
                </>
              )}
            </label>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Price (₦) *">
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

            <FormField label="Sort Order">
              <input
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category *">
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

            <FormField label="Delivery Time">
              <input
                type="text"
                value={deliveryTimeRange}
                onChange={(e) => setDeliveryTimeRange(e.target.value)}
                placeholder="e.g. 25-35 mins"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </FormField>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Available Now
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isAvailable}
              onClick={() => setIsAvailable((v) => !v)}
              className={`relative h-7 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 ${
                isAvailable ? "bg-emerald-500" : "bg-slate-200"
              }`}
              style={{ width: "3.25rem" }}
            >
              <span
                className={`block h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                  isAvailable ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
              <span className="sr-only">{isAvailable ? "Available" : "Unavailable"}</span>
            </button>
          </div>

          {modifierGroups.length > 0 && (
            <FormField label="Modifier Groups">
              <div className="flex max-h-36 flex-col gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
                {modifierGroups.map((group) => {
                  const checked = selectedModifierGroupIds.includes(group.id);
                  return (
                    <label
                      key={group.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleModifierGroup(group.id)}
                        className="h-4 w-4 rounded accent-emerald-500"
                      />
                      <span className="text-sm text-slate-700">{group.name}</span>
                      {group.isRequired && (
                        <span className="ml-auto text-xs font-medium text-orange-500">
                          Required
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </FormField>
          )}

          <button
            type="submit"
            disabled={isPending || !name.trim() || !price || !categoryId}
            className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
          >
            {isPending ? "Creating…" : "Create Item"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Edit item modal ──────────────────────────────────────────────────────────

function EditItemModal({
  item,
  outletId,
  categories,
  onClose,
}: {
  item: MenuItem;
  outletId: string;
  categories: { id: string; name: string }[];
  onClose: () => void;
}) {
  const { mutate: updateItem, isPending } = useUpdateMenuItem(outletId);
  const { data: modifierGroups = [] } = useItemModifierGroups(outletId);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [price, setPrice] = useState(String(item.priceMinor / 100));
  const [categoryId, setCategoryId] = useState(item.categoryId);
  const [isAvailable, setIsAvailable] = useState(item.isAvailable);
  const [sortOrder, setSortOrder] = useState(String(item.sortOrder));
  const [deliveryTimeRange, setDeliveryTimeRange] = useState("");
  const [selectedModifierGroupIds, setSelectedModifierGroupIds] = useState<string[]>([]);
  const [shaking, setShaking] = useState(false);

  function triggerShake() {
    setShaking(true);
    setTimeout(() => setShaking(false), 450);
  }

  function toggleModifierGroup(id: string) {
    setSelectedModifierGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceMinor = Math.round(parseFloat(price) * 100);
    if (!name.trim() || isNaN(priceMinor) || priceMinor <= 0 || !categoryId) {
      triggerShake();
      return;
    }
    updateItem(
      {
        itemId: item.id,
        body: {
          outletId,
          categoryId,
          name: name.trim(),
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
          ...(deliveryTimeRange.trim() ? { deliveryTimeRange: deliveryTimeRange.trim() } : {}),
          priceMinor,
          isAvailable,
          sortOrder: parseInt(sortOrder, 10) || 0,
          ...(selectedModifierGroupIds.length > 0
            ? { modifierGroupIds: selectedModifierGroupIds }
            : {}),
        },
        ...(imageFile ? { imageFile } : {}),
      },
      { onSuccess: onClose, onError: triggerShake },
    );
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div
        className={`flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl ${shaking ? "animate-shake" : ""}`}
      >
        <div className="relative border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-bold text-slate-900">Edit Menu Item</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto px-6 py-5">
          <FormField label="Item Name *">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </FormField>

          <FormField label="Description">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of the item"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </FormField>

          <FormField label="Item Image">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm transition hover:border-emerald-400 hover:bg-emerald-50/30">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
              {imageFile ? (
                <div className="flex w-full items-center gap-3">
                  <img
                    src={URL.createObjectURL(imageFile)}
                    alt="preview"
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                  <span className="min-w-0 flex-1 truncate text-slate-700">{imageFile.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setImageFile(null);
                    }}
                    className="shrink-0 text-xs text-slate-400 hover:text-red-500"
                  >
                    Remove
                  </button>
                </div>
              ) : item.imageUrl ? (
                <div className="flex w-full items-center gap-3">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-500">
                    Current image — click to replace
                  </span>
                </div>
              ) : (
                <>
                  <span className="text-2xl">🖼️</span>
                  <span className="text-slate-500">Click to upload image</span>
                  <span className="text-xs text-slate-400">PNG, JPG, WEBP</span>
                </>
              )}
            </label>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Price (₦) *">
              <input
                type="number"
                required
                min={1}
                step={50}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </FormField>

            <FormField label="Sort Order">
              <input
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category *">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Delivery Time">
              <input
                type="text"
                value={deliveryTimeRange}
                onChange={(e) => setDeliveryTimeRange(e.target.value)}
                placeholder="e.g. 25-35 mins"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </FormField>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Available Now
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isAvailable}
              onClick={() => setIsAvailable((v) => !v)}
              className={`relative h-7 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 ${
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

          {modifierGroups.length > 0 && (
            <FormField label="Modifier Groups">
              <div className="flex max-h-36 flex-col gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
                {modifierGroups.map((group) => {
                  const checked = selectedModifierGroupIds.includes(group.id);
                  return (
                    <label
                      key={group.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleModifierGroup(group.id)}
                        className="h-4 w-4 rounded accent-emerald-500"
                      />
                      <span className="text-sm text-slate-700">{group.name}</span>
                      {group.isRequired && (
                        <span className="ml-auto text-xs font-medium text-orange-500">
                          Required
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </FormField>
          )}

          <button
            type="submit"
            disabled={isPending || !name.trim() || !price || !categoryId}
            className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save Changes"}
          </button>
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
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

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

  // Resolve category name for the selected item
  const selectedCategoryName = selectedItemId
    ? categories.find((c) => c.id === serverItems.find((i) => i.id === selectedItemId)?.categoryId)
        ?.name
    : undefined;

  if (selectedItemId) {
    return (
      <>
        <MenuItemDetail
          itemId={selectedItemId}
          outletId={outletId}
          {...(selectedCategoryName ? { categoryName: selectedCategoryName } : {})}
          onBack={() => setSelectedItemId(null)}
          onEdit={setEditingItem}
        />
        {editingItem && (
          <EditItemModal
            item={editingItem}
            outletId={outletId}
            categories={categories}
            onClose={() => setEditingItem(null)}
          />
        )}
      </>
    );
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
                <SortableMenuItemCard
                  key={item.id}
                  item={item}
                  outletId={outletId}
                  onSelect={() => setSelectedItemId(item.id)}
                  onEdit={() => setEditingItem(item)}
                />
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

      {editingItem && (
        <EditItemModal
          item={editingItem}
          outletId={outletId}
          categories={categories}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}
