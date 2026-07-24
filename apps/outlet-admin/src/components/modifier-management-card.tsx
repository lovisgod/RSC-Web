import type { ItemModifier, ItemModifierGroup } from "@rsc/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Info, Loader2, Pencil, Plus, SlidersHorizontal, Trash2, X } from "lucide-react";
import { useState } from "react";

import { useOutletInfo } from "../hooks/use-outlet-info";
import {
  createItemModifier,
  createItemModifierGroup,
  deleteItemModifier,
  deleteItemModifierGroup,
  updateItemModifier,
  updateItemModifierGroup,
  type SaveItemModifierBody,
  type SaveItemModifierGroupBody,
} from "../lib/api";
import { outletAdminKeys } from "../lib/query-keys";
import { toastBus } from "../lib/toast-bus";

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

function formatPriceDelta(value: number): string {
  if (value === 0) return "No extra charge";
  return `+₦${(value / 100).toLocaleString("en-NG")}`;
}

function ModalShell({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(event) => event.target === event.currentTarget && !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModifierGroupEditor({
  group,
  busy,
  onClose,
  onSave,
}: {
  group: ItemModifierGroup | null;
  busy: boolean;
  onClose: () => void;
  onSave: (body: SaveItemModifierGroupBody) => void;
}) {
  const [name, setName] = useState(group?.name ?? "");
  const [isRequired, setIsRequired] = useState(group?.isRequired ?? false);
  const [minSelections, setMinSelections] = useState(group?.minSelections ?? 0);
  const [maxSelections, setMaxSelections] = useState(group?.maxSelections ?? 1);
  const [sortOrder, setSortOrder] = useState(group?.sortOrder ?? 0);
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalizedMin = isRequired ? Math.max(1, minSelections) : minSelections;

    if (name.trim().length < 2) {
      setError("Enter a group name with at least two characters.");
      return;
    }
    if (normalizedMin < 0 || maxSelections < 1 || maxSelections < normalizedMin) {
      setError("Maximum selections must be at least the minimum and greater than zero.");
      return;
    }

    onSave({
      name: name.trim(),
      minSelections: normalizedMin,
      maxSelections,
      isRequired,
      sortOrder,
    });
  }

  return (
    <ModalShell
      title={group ? "Edit modifier group" : "Create modifier group"}
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit} className="space-y-4 p-5">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Group name
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={fieldClass}
            placeholder="e.g. Choose your protein"
            autoFocus
          />
        </label>

        <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
          <span>
            <span className="block text-sm font-semibold text-slate-800">Required selection</span>
            <span className="text-xs text-slate-500">Customers must choose from this group.</span>
          </span>
          <input
            type="checkbox"
            checked={isRequired}
            onChange={(event) => {
              setIsRequired(event.target.checked);
              if (event.target.checked && minSelections === 0) setMinSelections(1);
            }}
            className="h-5 w-5 accent-emerald-500"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Minimum
            </span>
            <input
              type="number"
              min={isRequired ? 1 : 0}
              value={minSelections}
              onChange={(event) => setMinSelections(Number(event.target.value))}
              className={fieldClass}
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Maximum
            </span>
            <input
              type="number"
              min={1}
              value={maxSelections}
              onChange={(event) => setMaxSelections(Number(event.target.value))}
              className={fieldClass}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
            Display order
            <button
              type="button"
              aria-label="Lower numbers show this modifier group earlier on the item options screen."
              title="Lower numbers show this modifier group earlier on the item options screen."
              className="grid h-5 w-5 place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-500"
            >
              <Info size={11} aria-hidden="true" />
            </button>
          </span>
          <input
            type="number"
            min={0}
            value={sortOrder}
            onChange={(event) => setSortOrder(Number(event.target.value))}
            className={fieldClass}
          />
        </label>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
          {busy ? "Saving…" : group ? "Save group" : "Create group"}
        </button>
      </form>
    </ModalShell>
  );
}

function ModifierOptionEditor({
  group,
  modifier,
  busy,
  onClose,
  onSave,
}: {
  group: ItemModifierGroup;
  modifier: ItemModifier | null;
  busy: boolean;
  onClose: () => void;
  onSave: (body: SaveItemModifierBody) => void;
}) {
  const [name, setName] = useState(modifier?.name ?? "");
  const [price, setPrice] = useState(modifier ? String(modifier.priceDeltaMinor / 100) : "0");
  const [isAvailable, setIsAvailable] = useState(modifier?.isAvailable ?? true);
  const [sortOrder, setSortOrder] = useState(modifier?.sortOrder ?? 0);
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const priceDeltaMinor = Math.round(Number(price) * 100);

    if (name.trim().length < 2) {
      setError("Enter an option name with at least two characters.");
      return;
    }
    if (!Number.isFinite(priceDeltaMinor) || priceDeltaMinor < 0) {
      setError("Enter a valid price of zero or more.");
      return;
    }

    onSave({
      groupId: group.id,
      name: name.trim(),
      priceDeltaMinor,
      isAvailable,
      sortOrder,
    });
  }

  return (
    <ModalShell
      title={modifier ? `Edit ${modifier.name}` : `Add option to ${group.name}`}
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit} className="space-y-4 p-5">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Option name
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={fieldClass}
            placeholder="e.g. Extra cheese"
            autoFocus
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Additional price (₦)
          </span>
          <input
            type="number"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className={fieldClass}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
              Display order
              <button
                type="button"
                aria-label="Lower numbers show this option earlier inside its modifier group."
                title="Lower numbers show this option earlier inside its modifier group."
                className="grid h-5 w-5 place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-500"
              >
                <Info size={11} aria-hidden="true" />
              </button>
            </span>
            <input
              type="number"
              min={0}
              value={sortOrder}
              onChange={(event) => setSortOrder(Number(event.target.value))}
              className={fieldClass}
            />
          </label>
          <label className="flex items-end">
            <span className="flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-200 px-3">
              <span className="text-sm font-semibold text-slate-700">Available</span>
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(event) => setIsAvailable(event.target.checked)}
                className="h-5 w-5 accent-emerald-500"
              />
            </span>
          </label>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
          {busy ? "Saving…" : modifier ? "Save option" : "Add option"}
        </button>
      </form>
    </ModalShell>
  );
}

interface DeleteTarget {
  kind: "group" | "modifier";
  id: string;
  name: string;
}

function DeleteConfirmation({
  target,
  busy,
  onClose,
  onConfirm,
}: {
  target: DeleteTarget;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell title={`Delete ${target.name}?`} onClose={onClose} busy={busy}>
      <div className="space-y-4 p-5">
        <p className="text-sm leading-6 text-slate-600">
          {target.kind === "group"
            ? "This group will stop appearing on attached menu items. Existing historical orders are not changed."
            : "This option will no longer be available for future orders."}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
            Delete
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export function ModifierManagementCard({ outletId }: { outletId: string }) {
  const queryClient = useQueryClient();
  const { data: outlet, isLoading } = useOutletInfo(outletId);
  const [groupEditor, setGroupEditor] = useState<ItemModifierGroup | "new" | null>(null);
  const [optionEditor, setOptionEditor] = useState<{
    group: ItemModifierGroup;
    modifier: ItemModifier | null;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  async function refreshModifierData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: outletAdminKeys.outlet.root(outletId) }),
      queryClient.invalidateQueries({ queryKey: outletAdminKeys.modifierGroups(outletId) }),
    ]);
  }

  const saveGroup = useMutation({
    mutationFn: ({
      group,
      body,
    }: {
      group: ItemModifierGroup | null;
      body: SaveItemModifierGroupBody;
    }) => (group ? updateItemModifierGroup(group.id, body) : createItemModifierGroup(body)),
    onSuccess: async (_, variables) => {
      await refreshModifierData();
      setGroupEditor(null);
      toastBus.emit(variables.group ? "Modifier group updated" : "Modifier group created");
    },
    onError: (error: Error) => toastBus.emit(error.message, "error"),
  });

  const saveOption = useMutation({
    mutationFn: ({
      modifier,
      body,
    }: {
      modifier: ItemModifier | null;
      body: SaveItemModifierBody;
    }) => (modifier ? updateItemModifier(modifier.id, body) : createItemModifier(body)),
    onSuccess: async (_, variables) => {
      await refreshModifierData();
      setOptionEditor(null);
      toastBus.emit(variables.modifier ? "Modifier option updated" : "Modifier option added");
    },
    onError: (error: Error) => toastBus.emit(error.message, "error"),
  });

  const removeItem = useMutation({
    mutationFn: (target: DeleteTarget) =>
      target.kind === "group" ? deleteItemModifierGroup(target.id) : deleteItemModifier(target.id),
    onSuccess: async (_, target) => {
      await refreshModifierData();
      setDeleteTarget(null);
      toastBus.emit(target.kind === "group" ? "Modifier group deleted" : "Modifier option deleted");
    },
    onError: (error: Error) => toastBus.emit(error.message, "error"),
  });

  const toggleAvailability = useMutation({
    mutationFn: (modifier: ItemModifier) =>
      updateItemModifier(modifier.id, { isAvailable: !modifier.isAvailable }),
    onSuccess: async (modifier) => {
      await refreshModifierData();
      toastBus.emit(modifier.isAvailable ? "Option is now available" : "Option is unavailable");
    },
    onError: (error: Error) => toastBus.emit(error.message, "error"),
  });

  const groups = [...(outlet?.itemModifierGroups ?? [])].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  );
  const modifiers = outlet?.itemModifiers ?? [];
  const assignmentCount = new Map<string, number>();

  for (const link of outlet?.menuItemModifierGroups ?? []) {
    assignmentCount.set(link.groupId, (assignmentCount.get(link.groupId) ?? 0) + 1);
  }

  return (
    <>
      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-bold text-slate-900">Modifier groups</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Create reusable choices and add-ons, then assign them to menu items.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setGroupEditor("new")}
            disabled={!outletId}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            Create group
          </button>
        </div>

        {isLoading ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[1, 2].map((item) => (
              <div key={item} className="h-32 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
            <p className="text-sm font-semibold text-slate-700">No modifier groups yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Start with a group such as “Choose your protein” or “Add extras”.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid max-h-64 gap-3 overflow-y-auto pr-1 md:grid-cols-2">
            {groups.map((group) => {
              const groupModifiers = modifiers
                .filter((modifier) => modifier.groupId === group.id)
                .sort((left, right) => left.sortOrder - right.sortOrder);

              return (
                <article
                  key={group.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-slate-900">{group.name}</h3>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                        <span
                          className={`rounded-full px-2 py-0.5 font-semibold ${
                            group.isRequired
                              ? "bg-orange-100 text-orange-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {group.isRequired ? "Required" : "Optional"}
                        </span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-slate-500">
                          Choose {group.minSelections}–{group.maxSelections}
                        </span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-slate-500">
                          {assignmentCount.get(group.id) ?? 0} menu items
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => setGroupEditor(group)}
                        aria-label={`Edit ${group.name}`}
                        className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700"
                      >
                        <Pencil className="h-5 w-5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget({ kind: "group", id: group.id, name: group.name })
                        }
                        aria-label={`Delete ${group.name}`}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {groupModifiers.length === 0 ? (
                      <p className="rounded-lg bg-white px-3 py-2 text-xs text-slate-400">
                        No options in this group.
                      </p>
                    ) : (
                      groupModifiers.map((modifier) => (
                        <div
                          key={modifier.id}
                          className="flex items-center gap-2 rounded-lg bg-white px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-700">
                              {modifier.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {formatPriceDelta(modifier.priceDeltaMinor)}
                            </p>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={modifier.isAvailable}
                            onClick={() => toggleAvailability.mutate(modifier)}
                            className={`h-5 w-9 rounded-full p-0.5 transition ${
                              modifier.isAvailable ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                                modifier.isAvailable ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                            <span className="sr-only">
                              {modifier.isAvailable ? "Available" : "Unavailable"}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setOptionEditor({ group, modifier })}
                            aria-label={`Edit ${modifier.name}`}
                            className="rounded p-1.5 text-slate-400 hover:text-slate-700"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
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
                            aria-label={`Delete ${modifier.name}`}
                            className="rounded p-1.5 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setOptionEditor({ group, modifier: null })}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Add option
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {groupEditor && (
        <ModifierGroupEditor
          group={groupEditor === "new" ? null : groupEditor}
          busy={saveGroup.isPending}
          onClose={() => setGroupEditor(null)}
          onSave={(body) =>
            saveGroup.mutate({
              group: groupEditor === "new" ? null : groupEditor,
              body,
            })
          }
        />
      )}

      {optionEditor && (
        <ModifierOptionEditor
          group={optionEditor.group}
          modifier={optionEditor.modifier}
          busy={saveOption.isPending}
          onClose={() => setOptionEditor(null)}
          onSave={(body) =>
            saveOption.mutate({
              modifier: optionEditor.modifier,
              body,
            })
          }
        />
      )}

      {deleteTarget && (
        <DeleteConfirmation
          target={deleteTarget}
          busy={removeItem.isPending}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => removeItem.mutate(deleteTarget)}
        />
      )}
    </>
  );
}
