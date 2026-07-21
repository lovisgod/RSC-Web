import Skeleton from "@mui/material/Skeleton";
import { Button, EmptyState } from "@rsc/ui";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  ItemModifier,
  ItemModifierGroup,
  MenuCategorySummary,
  MenuItem,
  OutletSummary,
} from "@rsc/contracts";
import {
  ArrowLeft,
  GripVertical,
  Info,
  Lightbulb,
  Pencil,
  Plus,
  Trash2,
  Utensils,
} from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createItemModifier,
  createItemModifierGroup,
  createMenuCategory,
  createMenuItem,
  deleteItemModifier,
  deleteItemModifierGroup,
  deleteMenuCategory,
  deleteMenuItem,
  getMenuItemById,
  getOutlet,
  listItemModifierGroups,
  listPreparationSuggestions,
  createPreparationSuggestion,
  deletePreparationSuggestion,
  updateItemModifier,
  updateItemModifierGroup,
  updateMenuCategory,
  updateMenuItem,
  updateMenuItemAvailability,
  uploadMenuItemImage,
  type CreateMenuItemBody,
  type SaveItemModifierBody,
  type SaveItemModifierGroupBody,
  type SaveMenuCategoryBody,
} from "../lib/api";
import { toastBus } from "../lib/toast-bus";

const outletKey = (outletId: string) => ["admin", "outlets", outletId] as const;
const menuItemKey = (itemId: string | null) => ["admin", "menu-item", itemId] as const;
const modifierGroupsKey = (outletId: string) => ["admin", "modifier-groups", outletId] as const;

const EMPTY_ITEMS: MenuItem[] = [];

function formatPrice(minor: number): string {
  return `₦${(minor / 100).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

function useOutletMenuData(outletId: string) {
  return useQuery({
    queryKey: outletKey(outletId),
    queryFn: () => getOutlet(outletId),
    enabled: Boolean(outletId),
    staleTime: 60_000,
  });
}

function useOutletModifierGroups(outletId: string) {
  return useQuery({
    queryKey: modifierGroupsKey(outletId),
    queryFn: () => listItemModifierGroups(outletId),
    enabled: Boolean(outletId),
    staleTime: 60_000,
  });
}

function useMenuItem(itemId: string | null) {
  return useQuery({
    queryKey: menuItemKey(itemId),
    queryFn: () => getMenuItemById(itemId!),
    enabled: Boolean(itemId),
  });
}

function useRefreshOutletMenu(outletId: string) {
  const queryClient = useQueryClient();

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: outletKey(outletId) }),
      queryClient.invalidateQueries({ queryKey: modifierGroupsKey(outletId) }),
      queryClient.invalidateQueries({ queryKey: ["menu-items"] }),
    ]);
}

function FormField({
  label,
  children,
  tooltip,
}: {
  label: string;
  children: React.ReactNode;
  tooltip?: string;
}) {
  return (
    <label className="admin-menu-field">
      <span className="admin-menu-field__label-row">
        {label}
        {tooltip && (
          <button
            type="button"
            className="admin-field-tooltip"
            aria-label={tooltip}
            title={tooltip}
            tabIndex={0}
          >
            <Info size={13} aria-hidden="true" />
          </button>
        )}
      </span>
      {children}
    </label>
  );
}

function CategoryTabs({
  categories,
  activeCategoryId,
  onChange,
}: {
  categories: OutletSummary["menuCategories"];
  activeCategoryId: string | undefined;
  onChange: (categoryId: string | undefined) => void;
}) {
  if (categories.length === 0) return null;

  return (
    <div className="admin-menu-tabs" aria-label="Menu categories">
      <button
        type="button"
        className={`admin-menu-tab${!activeCategoryId ? " admin-menu-tab--active" : ""}`}
        onClick={() => onChange(undefined)}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          className={`admin-menu-tab${
            activeCategoryId === category.id ? " admin-menu-tab--active" : ""
          }`}
          onClick={() => onChange(category.id)}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}

function MenuItemCard({
  item,
  outletId,
  onSelect,
  onEdit,
  dragRef,
  dragStyle,
  dragListeners,
}: {
  item: MenuItem;
  outletId: string;
  onSelect: () => void;
  onEdit: () => void;
  dragRef?: (node: HTMLElement | null) => void;
  dragStyle?: React.CSSProperties;
  dragListeners?: React.HTMLAttributes<HTMLElement>;
}) {
  const refresh = useRefreshOutletMenu(outletId);
  const [isAvailable, setIsAvailable] = useState(item.isAvailable);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const toggle = useMutation({
    mutationFn: (next: boolean) => updateMenuItemAvailability(item.id, { isAvailable: next }),
    onSuccess: async () => {
      await refresh();
      toastBus.emit("Item availability updated", "success");
    },
    onError: (err: Error) => {
      setIsAvailable(item.isAvailable);
      toastBus.emit(err.message, "error");
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteMenuItem(item.id),
    onSuccess: async () => {
      await refresh();
      toastBus.emit("Menu item deleted", "success");
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
    onSettled: () => setConfirmDelete(false),
  });

  return (
    <article ref={dragRef} style={dragStyle} className="admin-menu-item-card">
      {confirmDelete && (
        <div className="admin-menu-delete-cover">
          <p>
            Delete <strong>{item.name}</strong>?
          </p>
          <div>
            <button type="button" onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
            <button type="button" disabled={remove.isPending} onClick={() => remove.mutate()}>
              {remove.isPending ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        {...dragListeners}
        className="admin-menu-grip admin-menu-grip-button"
        aria-label="Drag to reorder"
        onClick={(event) => event.stopPropagation()}
      >
        <GripVertical aria-hidden="true" size={16} />
      </button>
      <button type="button" className="admin-menu-item-main" onClick={onSelect}>
        <span className="admin-menu-item-image">
          {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <span>🍽️</span>}
        </span>
        <span className="admin-menu-item-copy">
          <strong>{item.name}</strong>
          <small>{formatPrice(item.priceMinor)}</small>
        </span>
      </button>
      <div className="admin-menu-item-actions">
        <button
          type="button"
          role="switch"
          aria-checked={isAvailable}
          disabled={toggle.isPending}
          className={`admin-menu-switch${isAvailable ? " admin-menu-switch--on" : ""}`}
          onClick={() => {
            const next = !isAvailable;
            setIsAvailable(next);
            toggle.mutate(next);
          }}
        >
          <span />
        </button>
        <span>
          <button type="button" aria-label="Edit item" onClick={onEdit}>
            <Pencil size={13} />
          </button>
          <button type="button" aria-label="Delete item" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={13} />
          </button>
        </span>
      </div>
    </article>
  );
}

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

function MenuItemModal({
  outletId,
  item,
  categories,
  assignedModifierGroupIds,
  onClose,
}: {
  outletId: string;
  item: MenuItem | null;
  categories: OutletSummary["menuCategories"];
  assignedModifierGroupIds: string[];
  onClose: () => void;
}) {
  const refresh = useRefreshOutletMenu(outletId);
  const { data: modifierGroups = [] } = useOutletModifierGroups(outletId);
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [price, setPrice] = useState(item ? String(item.priceMinor / 100) : "");
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? categories[0]?.id ?? "");
  const [deliveryTimeRange, setDeliveryTimeRange] = useState("");
  const [isAvailable, setIsAvailable] = useState(item?.isAvailable ?? true);
  const [modifierGroupIds, setModifierGroupIds] = useState(assignedModifierGroupIds);

  const save = useMutation({
    mutationFn: async () => {
      const priceMinor = Math.round(Number.parseFloat(price) * 100);
      if (!name.trim() || !categoryId || !Number.isFinite(priceMinor) || priceMinor <= 0) {
        throw new Error("Enter an item name, category, and valid price.");
      }

      const body: CreateMenuItemBody = {
        outletId,
        categoryId,
        name: name.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(deliveryTimeRange.trim() ? { deliveryTimeRange: deliveryTimeRange.trim() } : {}),
        priceMinor,
        isAvailable,
        sortOrder: item?.sortOrder ?? 0,
        modifierGroupIds,
      };

      const saved = item
        ? await updateMenuItem(item.id, {
            ...body,
            ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
          })
        : await createMenuItem(body);
      if (imageFile) {
        await uploadMenuItemImage(saved.id, imageFile);
      }
      return saved;
    },
    onSuccess: async () => {
      await refresh();
      toastBus.emit(item ? "Menu item updated" : "Menu item created", "success");
      onClose();
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });

  function toggleModifierGroup(id: string) {
    setModifierGroupIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  return createPortal(
    <div className="modal-overlay" aria-hidden="true" onClick={() => !save.isPending && onClose()}>
      <div
        className="modal admin-menu-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-menu-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__head">
          <div>
            <p className="kicker" style={{ margin: 0 }}>
              Menu control
            </p>
            <h2 id="admin-menu-modal-title">{item ? "Edit Menu Item" : "Add New Menu Item"}</h2>
          </div>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            disabled={save.isPending}
          >
            ×
          </button>
        </div>
        <form
          className="modal__body admin-menu-form"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <FormField label="Item Name *">
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </FormField>
          <FormField label="Description">
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Short item description"
            />
          </FormField>
          <FormField label="Item Image">
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
            />
            {item?.imageUrl && !imageFile && <small>Current image will be kept.</small>}
            {imageFile && <small>{imageFile.name}</small>}
          </FormField>
          <div className="admin-menu-form-grid admin-menu-form-grid--single">
            <FormField label="Price (₦) *">
              <input
                type="number"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                required
              />
            </FormField>
          </div>
          <div className="admin-menu-form-grid">
            <FormField label="Category *">
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                required
              >
                {categories.length === 0 && <option value="">No categories yet</option>}
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Delivery Time">
              <input
                value={deliveryTimeRange}
                onChange={(event) => setDeliveryTimeRange(event.target.value)}
                placeholder="e.g. 25-35 mins"
              />
            </FormField>
          </div>
          <label className="admin-menu-inline-switch">
            <span>Available Now</span>
            <button
              type="button"
              role="switch"
              aria-checked={isAvailable}
              className={`admin-menu-switch${isAvailable ? " admin-menu-switch--on" : ""}`}
              onClick={() => setIsAvailable((current) => !current)}
            >
              <span />
            </button>
          </label>
          {modifierGroups.length > 0 && (
            <FormField label="Modifier Groups">
              <div className="admin-menu-checklist">
                {modifierGroups.map((group) => (
                  <label key={group.id}>
                    <input
                      type="checkbox"
                      checked={modifierGroupIds.includes(group.id)}
                      onChange={() => toggleModifierGroup(group.id)}
                    />
                    <span>{group.name}</span>
                    {group.isRequired && <small>Required</small>}
                  </label>
                ))}
              </div>
            </FormField>
          )}
          <div className="modal__actions">
            <Button tone="quiet" type="button" onClick={onClose} disabled={save.isPending}>
              Cancel
            </Button>
            <Button tone="navy" type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : item ? "Save Changes" : "Create Item"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function MenuItemDetail({
  outletId,
  itemId,
  categoryName,
  onBack,
  onEdit,
}: {
  outletId: string;
  itemId: string;
  categoryName?: string;
  onBack: () => void;
  onEdit: (item: MenuItem) => void;
}) {
  const refresh = useRefreshOutletMenu(outletId);
  const { data: item, isLoading } = useMenuItem(itemId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const remove = useMutation({
    mutationFn: () => deleteMenuItem(itemId),
    onSuccess: async () => {
      await refresh();
      toastBus.emit("Menu item deleted", "success");
      onBack();
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });
  const toggle = useMutation({
    mutationFn: (next: boolean) => updateMenuItemAvailability(itemId, { isAvailable: next }),
    onSuccess: async () => {
      await refresh();
      toastBus.emit("Item availability updated", "success");
    },
    onError: (err: Error) => {
      setAvailable(item?.isAvailable ?? null);
      toastBus.emit(err.message, "error");
    },
  });

  if (isLoading) {
    return (
      <div className="admin-menu-detail">
        <Skeleton height={40} width={180} />
        <Skeleton variant="rectangular" height={180} sx={{ borderRadius: "18px" }} />
      </div>
    );
  }

  if (!item) {
    return <EmptyState icon={<Utensils size={30} />} heading="Item not found" />;
  }

  const isAvailable = available ?? item.isAvailable;

  return (
    <section className="panel admin-menu-detail">
      <div className="admin-menu-detail-head">
        <button type="button" onClick={onBack} aria-label="Back to menu">
          <ArrowLeft size={18} />
        </button>
        <h3>{item.name}</h3>
        <div>
          {!confirmDelete ? (
            <>
              <button type="button" onClick={() => onEdit(item)}>
                <Pencil size={14} />
                Edit
              </button>
              <button type="button" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={14} />
                Delete
              </button>
            </>
          ) : (
            <>
              <span>Delete this item?</span>
              <button type="button" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
              <button type="button" disabled={remove.isPending} onClick={() => remove.mutate()}>
                Yes, Delete
              </button>
            </>
          )}
        </div>
      </div>
      <div className="admin-menu-detail-image">
        {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <span>🍽️</span>}
      </div>
      <div className="admin-menu-detail-rows">
        <DetailRow label="Price">{formatPrice(item.priceMinor)}</DetailRow>
        {categoryName && <DetailRow label="Category">{categoryName}</DetailRow>}
        {item.description && <DetailRow label="Description">{item.description}</DetailRow>}
        <DetailRow label="Sort Order">{item.sortOrder}</DetailRow>
        <DetailRow label="Availability">
          <span className={isAvailable ? "text-success" : "text-muted"}>
            {isAvailable ? "Available" : "Unavailable"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isAvailable}
            disabled={toggle.isPending}
            className={`admin-menu-switch${isAvailable ? " admin-menu-switch--on" : ""}`}
            onClick={() => {
              const next = !isAvailable;
              setAvailable(next);
              toggle.mutate(next);
            }}
          >
            <span />
          </button>
        </DetailRow>
      </div>
    </section>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="admin-menu-detail-row">
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  );
}

function CategoryEditor({
  outletId,
  category,
  onClose,
}: {
  outletId: string;
  category: MenuCategorySummary | null;
  onClose: () => void;
}) {
  const refresh = useRefreshOutletMenu(outletId);
  const [name, setName] = useState(category?.name ?? "");
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const save = useMutation({
    mutationFn: () => {
      const body: SaveMenuCategoryBody = {
        outletId,
        name: name.trim(),
        sortOrder: Number.parseInt(sortOrder, 10) || 0,
        isActive,
      };
      if (!body.name) throw new Error("Enter a category name.");
      return category ? updateMenuCategory(category.id, body) : createMenuCategory(body);
    },
    onSuccess: async () => {
      await refresh();
      toastBus.emit(category ? "Category updated" : "Category created", "success");
      onClose();
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });

  return (
    <InlineEditor title={category ? "Edit category" : "Create category"} onClose={onClose}>
      <FormField label="Category Name">
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </FormField>
      <div className="admin-menu-form-grid">
        <FormField
          label="Sort Order"
          tooltip="Lower numbers appear first in the customer-facing menu sections."
        >
          <input
            type="number"
            min={0}
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
          />
        </FormField>
        <label className="admin-menu-inline-switch">
          <span>Active</span>
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            className={`admin-menu-switch${isActive ? " admin-menu-switch--on" : ""}`}
            onClick={() => setIsActive((current) => !current)}
          >
            <span />
          </button>
        </label>
      </div>
      <Button tone="navy" type="button" disabled={save.isPending} onClick={() => save.mutate()}>
        {save.isPending ? "Saving…" : "Save category"}
      </Button>
    </InlineEditor>
  );
}

function CategoryManagementCard({ outletId, outlet }: { outletId: string; outlet: OutletSummary }) {
  const refresh = useRefreshOutletMenu(outletId);
  const [editor, setEditor] = useState<MenuCategorySummary | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuCategorySummary | null>(null);
  const remove = useMutation({
    mutationFn: () => {
      if (!deleteTarget) return Promise.resolve();
      return deleteMenuCategory(deleteTarget.id);
    },
    onSuccess: async () => {
      await refresh();
      toastBus.emit("Category deleted", "success");
      setDeleteTarget(null);
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });
  const itemCount = new Map<string, number>();
  for (const item of outlet.menuItems) {
    itemCount.set(item.categoryId, (itemCount.get(item.categoryId) ?? 0) + 1);
  }
  const categories = [...outlet.menuCategories].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
  );

  return (
    <section className="panel admin-category-panel">
      <div className="admin-menu-section-head">
        <div>
          <h3>Categories</h3>
          <p>Create the menu sections that items are grouped under.</p>
        </div>
        <Button tone="navy" onClick={() => setEditor("new")}>
          <Plus size={15} />
          Create category
        </Button>
      </div>

      {editor && (
        <CategoryEditor
          outletId={outletId}
          category={editor === "new" ? null : editor}
          onClose={() => setEditor(null)}
        />
      )}

      {deleteTarget && (
        <div className="admin-menu-confirm">
          <span>Delete {deleteTarget.name}?</span>
          <button type="button" onClick={() => setDeleteTarget(null)}>
            Cancel
          </button>
          <button type="button" disabled={remove.isPending} onClick={() => remove.mutate()}>
            Delete
          </button>
        </div>
      )}

      {categories.length === 0 ? (
        <EmptyState icon={<Plus size={30} />} heading="No categories yet" />
      ) : (
        <div className="admin-category-list">
          {categories.map((category) => (
            <article
              key={category.id}
              className={`admin-category-card${
                category.isActive ? "" : " admin-category-card--inactive"
              }`}
            >
              <div>
                <strong>{category.name}</strong>
                <small>
                  {itemCount.get(category.id) ?? 0} items · Sort {category.sortOrder} ·{" "}
                  {category.isActive ? "Active" : "Inactive"}
                </small>
              </div>
              <span>
                <button
                  type="button"
                  aria-label={`Edit ${category.name}`}
                  onClick={() => setEditor(category)}
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${category.name}`}
                  onClick={() => setDeleteTarget(category)}
                >
                  <Trash2 size={13} />
                </button>
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ModifierEditor({
  outletId,
  group,
  onClose,
}: {
  outletId: string;
  group: ItemModifierGroup | null;
  onClose: () => void;
}) {
  const refresh = useRefreshOutletMenu(outletId);
  const [name, setName] = useState(group?.name ?? "");
  const [minSelections, setMinSelections] = useState(String(group?.minSelections ?? 0));
  const [maxSelections, setMaxSelections] = useState(String(group?.maxSelections ?? 1));
  const [isRequired, setIsRequired] = useState(group?.isRequired ?? false);
  const [sortOrder, setSortOrder] = useState(String(group?.sortOrder ?? 0));
  const save = useMutation({
    mutationFn: () => {
      const body: SaveItemModifierGroupBody = {
        outletId,
        name: name.trim(),
        minSelections: Number.parseInt(minSelections, 10) || 0,
        maxSelections: Number.parseInt(maxSelections, 10) || 0,
        isRequired,
        sortOrder: Number.parseInt(sortOrder, 10) || 0,
      };
      if (!body.name) throw new Error("Enter a modifier group name.");
      return group ? updateItemModifierGroup(group.id, body) : createItemModifierGroup(body);
    },
    onSuccess: async () => {
      await refresh();
      toastBus.emit(group ? "Modifier group updated" : "Modifier group created", "success");
      onClose();
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });

  return (
    <InlineEditor title={group ? "Edit modifier group" : "Create modifier group"} onClose={onClose}>
      <FormField label="Name">
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </FormField>
      <div className="admin-menu-form-grid">
        <FormField label="Min">
          <input
            type="number"
            min={0}
            value={minSelections}
            onChange={(event) => setMinSelections(event.target.value)}
          />
        </FormField>
        <FormField label="Max">
          <input
            type="number"
            min={0}
            value={maxSelections}
            onChange={(event) => setMaxSelections(event.target.value)}
          />
        </FormField>
      </div>
      <div className="admin-menu-form-grid">
        <FormField
          label="Sort Order"
          tooltip="Lower numbers show this modifier group earlier on the item options screen."
        >
          <input
            type="number"
            min={0}
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
          />
        </FormField>
        <label className="admin-menu-checkbox">
          <input
            type="checkbox"
            checked={isRequired}
            onChange={(event) => setIsRequired(event.target.checked)}
          />
          Required
        </label>
      </div>
      <Button tone="navy" type="button" disabled={save.isPending} onClick={() => save.mutate()}>
        {save.isPending ? "Saving…" : "Save group"}
      </Button>
    </InlineEditor>
  );
}

function ModifierOptionEditor({
  outletId,
  group,
  modifier,
  onClose,
}: {
  outletId: string;
  group: ItemModifierGroup;
  modifier: ItemModifier | null;
  onClose: () => void;
}) {
  const refresh = useRefreshOutletMenu(outletId);
  const [name, setName] = useState(modifier?.name ?? "");
  const [price, setPrice] = useState(String((modifier?.priceDeltaMinor ?? 0) / 100));
  const [isAvailable, setIsAvailable] = useState(modifier?.isAvailable ?? true);
  const [sortOrder, setSortOrder] = useState(String(modifier?.sortOrder ?? 0));
  const save = useMutation({
    mutationFn: () => {
      const body: SaveItemModifierBody = {
        outletId,
        groupId: group.id,
        name: name.trim(),
        priceDeltaMinor: Math.round((Number.parseFloat(price) || 0) * 100),
        isAvailable,
        sortOrder: Number.parseInt(sortOrder, 10) || 0,
      };
      if (!body.name) throw new Error("Enter a modifier option name.");
      return modifier ? updateItemModifier(modifier.id, body) : createItemModifier(body);
    },
    onSuccess: async () => {
      await refresh();
      toastBus.emit(modifier ? "Modifier option updated" : "Modifier option added", "success");
      onClose();
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });

  return (
    <InlineEditor
      title={modifier ? `Edit ${modifier.name}` : `Add option to ${group.name}`}
      onClose={onClose}
    >
      <FormField label="Option Name">
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </FormField>
      <div className="admin-menu-form-grid">
        <FormField label="Price Delta (₦)">
          <input type="number" value={price} onChange={(event) => setPrice(event.target.value)} />
        </FormField>
        <FormField
          label="Sort Order"
          tooltip="Lower numbers show this option earlier inside its modifier group."
        >
          <input
            type="number"
            min={0}
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
          />
        </FormField>
      </div>
      <label className="admin-menu-inline-switch">
        <span>Available</span>
        <button
          type="button"
          role="switch"
          aria-checked={isAvailable}
          className={`admin-menu-switch${isAvailable ? " admin-menu-switch--on" : ""}`}
          onClick={() => setIsAvailable((current) => !current)}
        >
          <span />
        </button>
      </label>
      <Button tone="navy" type="button" disabled={save.isPending} onClick={() => save.mutate()}>
        {save.isPending ? "Saving…" : modifier ? "Save option" : "Add option"}
      </Button>
    </InlineEditor>
  );
}

function InlineEditor({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="admin-menu-inline-editor">
      <div>
        <strong>{title}</strong>
        <button type="button" onClick={onClose}>
          ×
        </button>
      </div>
      {children}
    </div>
  );
}

function ModifierManagementCard({ outletId, outlet }: { outletId: string; outlet: OutletSummary }) {
  const refresh = useRefreshOutletMenu(outletId);
  const [groupEditor, setGroupEditor] = useState<ItemModifierGroup | "new" | null>(null);
  const [optionEditor, setOptionEditor] = useState<{
    group: ItemModifierGroup;
    modifier: ItemModifier | null;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: "group"; id: string; name: string }
    | { kind: "modifier"; id: string; name: string }
    | null
  >(null);
  const toggleOption = useMutation({
    mutationFn: (modifier: ItemModifier) =>
      updateItemModifier(modifier.id, {
        outletId,
        isAvailable: !modifier.isAvailable,
      }),
    onSuccess: async (modifier) => {
      await refresh();
      toastBus.emit(modifier.isAvailable ? "Option is now available" : "Option is unavailable");
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });
  const remove = useMutation({
    mutationFn: () => {
      if (!deleteTarget) return Promise.resolve();
      return deleteTarget.kind === "group"
        ? deleteItemModifierGroup(deleteTarget.id)
        : deleteItemModifier(deleteTarget.id);
    },
    onSuccess: async () => {
      await refresh();
      toastBus.emit(
        deleteTarget?.kind === "group" ? "Modifier group deleted" : "Modifier option deleted",
      );
      setDeleteTarget(null);
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });

  const groups = [...outlet.itemModifierGroups].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
  );
  const assignmentCount = new Map<string, number>();
  for (const link of outlet.menuItemModifierGroups) {
    assignmentCount.set(link.groupId, (assignmentCount.get(link.groupId) ?? 0) + 1);
  }

  return (
    <section className="panel admin-modifier-panel">
      <div className="admin-menu-section-head">
        <div>
          <h3>Modifier groups</h3>
          <p>Create reusable add-ons and choices, then assign them to menu items.</p>
        </div>
        <Button tone="navy" onClick={() => setGroupEditor("new")}>
          <Plus size={15} />
          Create group
        </Button>
      </div>

      {groupEditor && (
        <ModifierEditor
          outletId={outletId}
          group={groupEditor === "new" ? null : groupEditor}
          onClose={() => setGroupEditor(null)}
        />
      )}
      {optionEditor && (
        <ModifierOptionEditor
          outletId={outletId}
          group={optionEditor.group}
          modifier={optionEditor.modifier}
          onClose={() => setOptionEditor(null)}
        />
      )}
      {deleteTarget && (
        <div className="admin-menu-confirm">
          <span>Delete {deleteTarget.name}?</span>
          <button type="button" onClick={() => setDeleteTarget(null)}>
            Cancel
          </button>
          <button type="button" disabled={remove.isPending} onClick={() => remove.mutate()}>
            Delete
          </button>
        </div>
      )}

      {groups.length === 0 ? (
        <EmptyState icon={<Plus size={30} />} heading="No modifier groups yet" />
      ) : (
        <div className="admin-modifier-groups">
          {groups.map((group) => {
            const modifiers = outlet.itemModifiers
              .filter((modifier) => modifier.groupId === group.id)
              .sort(
                (left, right) =>
                  left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
              );
            return (
              <article className="admin-modifier-group" key={group.id}>
                <div className="admin-modifier-group-head">
                  <div>
                    <strong>{group.name}</strong>
                    <small>
                      {group.isRequired ? "Required" : "Optional"} · {group.minSelections}-
                      {group.maxSelections} selections · {assignmentCount.get(group.id) ?? 0} menu
                      items
                    </small>
                  </div>
                  <span>
                    <button type="button" onClick={() => setGroupEditor(group)}>
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({ kind: "group", id: group.id, name: group.name })
                      }
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                </div>
                {modifiers.length === 0 ? (
                  <p className="admin-modifier-empty">No options yet.</p>
                ) : (
                  <ul className="admin-modifier-options">
                    {modifiers.map((modifier) => (
                      <li key={modifier.id}>
                        <span>
                          <strong>{modifier.name}</strong>
                          <small>{formatPrice(modifier.priceDeltaMinor)}</small>
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={modifier.isAvailable}
                          disabled={toggleOption.isPending}
                          className={`admin-menu-switch${
                            modifier.isAvailable ? " admin-menu-switch--on" : ""
                          }`}
                          onClick={() => toggleOption.mutate(modifier)}
                        >
                          <span />
                        </button>
                        <button type="button" onClick={() => setOptionEditor({ group, modifier })}>
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              kind: "modifier",
                              id: modifier.id,
                              name: modifier.name,
                            })
                          }
                        >
                          <Trash2 size={13} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  className="admin-modifier-add-option"
                  onClick={() => setOptionEditor({ group, modifier: null })}
                >
                  + Add option
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─── Suggestions Management Card ─────────────────────────────────────────

function SuggestionsManagementCard({ outletId }: { outletId: string }) {
  const queryClient = useQueryClient();
  const suggestionsKey = ["admin", "preparation-suggestions", outletId] as const;

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: suggestionsKey,
    queryFn: () => listPreparationSuggestions({ outletId }),
    enabled: Boolean(outletId),
    staleTime: 30_000,
  });

  const [newText, setNewText] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (text: string) => createPreparationSuggestion({ text, outletId, isActive: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: suggestionsKey });
      setNewText("");
      setFieldError(null);
      toastBus.emit("Preparation suggestion added", "success");
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePreparationSuggestion(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: suggestionsKey });
      toastBus.emit("Suggestion removed", "success");
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = newText.trim();
    if (!trimmed) {
      setFieldError("Suggestion text is required.");
      return;
    }
    if (trimmed.length > 255) {
      setFieldError("Must be 255 characters or fewer.");
      return;
    }
    setFieldError(null);
    createMutation.mutate(trimmed);
  }

  return (
    <section className="panel">
      <div className="staff-panel__head">
        <div>
          <h3 className="staff-panel__title">Preparation Suggestions</h3>
          <p className="staff-panel__subtitle">
            Quick-fill autocomplete hints shown to customers when leaving notes on an item.
          </p>
        </div>
        <span className="staff-panel__count">{suggestions.length}</span>
      </div>

      {/* Create form */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "flex-start",
          marginBottom: "1.25rem",
        }}
      >
        <div style={{ flex: 1 }}>
          <input
            id="prep-suggestion-input"
            type="text"
            placeholder="e.g. No onions, Extra sauce, Well done"
            value={newText}
            onChange={(e) => {
              setNewText(e.target.value);
              if (fieldError) setFieldError(null);
            }}
            disabled={createMutation.isPending}
            maxLength={255}
            aria-label="New preparation suggestion"
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? "prep-suggestion-error" : undefined}
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem",
              borderRadius: "0.5rem",
              border: fieldError ? "1.5px solid #e57373" : "1.5px solid #e0e0e0",
              fontSize: "0.875rem",
              outline: "none",
            }}
          />
          {fieldError && (
            <p
              id="prep-suggestion-error"
              style={{ color: "#e53935", fontSize: "0.75rem", marginTop: "0.25rem" }}
            >
              {fieldError}
            </p>
          )}
        </div>
        <Button tone="navy" type="submit" disabled={createMutation.isPending}>
          <Plus size={15} />
          {createMutation.isPending ? "Adding…" : "Add"}
        </Button>
      </form>

      {/* List */}
      {isLoading ? (
        <ul className="staff-list">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="staff-item">
              <Skeleton variant="text" sx={{ flex: 1, fontSize: "0.9rem" }} />
            </li>
          ))}
        </ul>
      ) : suggestions.length === 0 ? (
        <EmptyState
          icon={<Lightbulb size={28} />}
          heading="No suggestions yet"
          body="Add your first preparation hint above."
        />
      ) : (
        <ul className="staff-list">
          {suggestions.map((suggestion) => (
            <li key={suggestion.id} className="staff-item">
              <div className="staff-item__info" style={{ flex: 1 }}>
                <span className="staff-item__name">{suggestion.text}</span>
                {!suggestion.isActive && (
                  <span
                    className="staff-item__sub"
                    style={{ color: "#9e9e9e", fontSize: "0.72rem" }}
                  >
                    inactive
                  </span>
                )}
              </div>
              <button
                type="button"
                className="outlet-icon-btn outlet-icon-btn--delete"
                aria-label={`Remove suggestion: ${suggestion.text}`}
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(suggestion.id)}
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
export function OutletMenuManager({ outletId }: { outletId: string }) {
  const { data: outlet, isLoading } = useOutletMenuData(outletId);
  const queryClient = useQueryClient();
  const [activeCategoryId, setActiveCategoryId] = useState<string | undefined>();
  const [activeMenuSection, setActiveMenuSection] = useState<
    "items" | "modifiers" | "categories" | "suggestions"
  >("items");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [itemOrderByCategory, setItemOrderByCategory] = useState<Record<string, string[]>>({});

  const items = outlet?.menuItems ?? EMPTY_ITEMS;
  const visibleItems = useMemo(
    () => (activeCategoryId ? items.filter((item) => item.categoryId === activeCategoryId) : items),
    [activeCategoryId, items],
  );
  const sortKey = activeCategoryId ?? "all";
  const sortedItems = useMemo(() => {
    const baseItems = visibleItems
      .slice()
      .sort(
        (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
      );
    const preferredOrder = itemOrderByCategory[sortKey];
    if (!preferredOrder) return baseItems;

    const itemsById = new Map(baseItems.map((item) => [item.id, item]));
    const orderedItems = preferredOrder.flatMap((itemId) => {
      const item = itemsById.get(itemId);
      return item ? [item] : [];
    });
    const orderedIds = new Set(preferredOrder);
    const newItems = baseItems.filter((item) => !orderedIds.has(item.id));

    return [...orderedItems, ...newItems];
  }, [itemOrderByCategory, sortKey, visibleItems]);
  const reorderItems = useMutation({
    mutationFn: async (nextItems: MenuItem[]) => {
      await Promise.all(
        nextItems.map((item, index) => updateMenuItem(item.id, { sortOrder: index })),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outletKey(outletId) });
      toastBus.emit("Menu order updated", "success");
    },
    onError: (err: Error) => {
      queryClient.invalidateQueries({ queryKey: outletKey(outletId) });
      toastBus.emit(err.message || "Could not update menu order", "error");
    },
  });
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
    reorderItems.mutate(nextItems);
  }
  const availableModifierGroupIds = new Set(
    outlet?.itemModifierGroups.map((group) => group.id) ?? [],
  );
  const assignedModifierGroupIds = (itemId: string) =>
    outlet?.menuItemModifierGroups
      .filter((link) => link.menuItemId === itemId && availableModifierGroupIds.has(link.groupId))
      .map((link) => link.groupId) ?? [];
  const selectedCategoryName = selectedItemId
    ? outlet?.menuCategories.find(
        (category) =>
          category.id === outlet.menuItems.find((item) => item.id === selectedItemId)?.categoryId,
      )?.name
    : undefined;

  if (isLoading) {
    return (
      <section className="panel admin-menu-panel">
        <Skeleton height={44} width={240} />
        <Skeleton variant="rectangular" height={130} sx={{ borderRadius: "18px" }} />
      </section>
    );
  }

  if (!outlet) return null;

  if (selectedItemId) {
    return (
      <>
        <MenuItemDetail
          outletId={outletId}
          itemId={selectedItemId}
          {...(selectedCategoryName ? { categoryName: selectedCategoryName } : {})}
          onBack={() => setSelectedItemId(null)}
          onEdit={setEditingItem}
        />
        {editingItem && (
          <MenuItemModal
            outletId={outletId}
            item={editingItem}
            categories={outlet.menuCategories}
            assignedModifierGroupIds={assignedModifierGroupIds(editingItem.id)}
            onClose={() => setEditingItem(null)}
          />
        )}
      </>
    );
  }

  return (
    <section className="admin-menu-manager">
      <div className="admin-menu-section-head">
        <div>
          <h3>Menu & Inventory Manager</h3>
          <p>Manage this outlet's items, categories, reusable add-ons, images, and prices.</p>
        </div>
        {activeMenuSection === "items" && (
          <Button tone="navy" onClick={() => setShowAddModal(true)}>
            <Plus size={15} />
            Add New Item
          </Button>
        )}
      </div>

      <div className="admin-menu-tabs admin-menu-mode-tabs" aria-label="Menu manager sections">
        <button
          type="button"
          className={`admin-menu-tab${activeMenuSection === "items" ? " admin-menu-tab--active" : ""}`}
          onClick={() => setActiveMenuSection("items")}
        >
          Items
        </button>
        <button
          type="button"
          className={`admin-menu-tab${activeMenuSection === "modifiers" ? " admin-menu-tab--active" : ""}`}
          onClick={() => setActiveMenuSection("modifiers")}
        >
          Modifiers
        </button>
        <button
          type="button"
          className={`admin-menu-tab${activeMenuSection === "categories" ? " admin-menu-tab--active" : ""}`}
          onClick={() => setActiveMenuSection("categories")}
        >
          Categories
        </button>
        <button
          type="button"
          className={`admin-menu-tab${activeMenuSection === "suggestions" ? " admin-menu-tab--active" : ""}`}
          onClick={() => setActiveMenuSection("suggestions")}
        >
          Suggestions
        </button>
      </div>

      {activeMenuSection === "items" && (
        <>
          <CategoryTabs
            categories={outlet.menuCategories}
            activeCategoryId={activeCategoryId}
            onChange={setActiveCategoryId}
          />

          {sortedItems.length === 0 ? (
            <div className="panel">
              <EmptyState icon={<Utensils size={30} />} heading="No items in this category" />
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedItems.map((item) => item.id)}
                strategy={rectSortingStrategy}
              >
                <div className="admin-menu-grid">
                  {sortedItems.map((item) => (
                    <SortableMenuItemCard
                      key={`${item.id}:${item.isAvailable}`}
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
        </>
      )}

      {activeMenuSection === "modifiers" && (
        <ModifierManagementCard outletId={outletId} outlet={outlet} />
      )}

      {activeMenuSection === "categories" && (
        <CategoryManagementCard outletId={outletId} outlet={outlet} />
      )}

      {activeMenuSection === "suggestions" && <SuggestionsManagementCard outletId={outletId} />}

      {showAddModal && (
        <MenuItemModal
          outletId={outletId}
          item={null}
          categories={outlet.menuCategories}
          assignedModifierGroupIds={[]}
          onClose={() => setShowAddModal(false)}
        />
      )}
      {editingItem && (
        <MenuItemModal
          outletId={outletId}
          item={editingItem}
          categories={outlet.menuCategories}
          assignedModifierGroupIds={assignedModifierGroupIds(editingItem.id)}
          onClose={() => setEditingItem(null)}
        />
      )}
    </section>
  );
}
