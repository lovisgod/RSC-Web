"use client";

import { Button } from "@rsc/ui";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { apiClient } from "@/src/lib/api";
import { formatNaira } from "@/src/lib/data/cart";
import type { DisplayModifierGroup, MenuItem } from "@/src/lib/data/outlet-menu";
import { useCartStore } from "@/src/stores/cart-store";

interface ItemDetailModalProps {
  item: MenuItem;
  outletName: string;
  onClose: () => void;
}

function ModifierGroupSection({
  group,
  selections,
  onToggle,
}: {
  group: DisplayModifierGroup;
  selections: Set<string>;
  onToggle: (modifierId: string) => void;
}) {
  const isRadio = group.maxSelections === 1;
  const atMax = !isRadio && selections.size >= group.maxSelections;

  return (
    <div className="bg-gray-50 rounded-2xl p-4">
      <div className="flex justify-between mb-3">
        <span className="text-sm font-bold text-gray-900">{group.name}</span>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={
            group.isRequired
              ? { backgroundColor: "var(--rsc-dark)", color: "#fff" }
              : { backgroundColor: "#e5e7eb", color: "#6b7280" }
          }
        >
          {group.isRequired ? "Required" : "Optional"}
        </span>
      </div>

      <div className="space-y-3">
        {group.modifiers.map((mod) => {
          const checked = selections.has(mod.id);
          const disabled = !checked && atMax;

          return (
            <label
              key={mod.id}
              className={`flex items-center justify-between gap-3 ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="flex items-center gap-3">
                <input
                  type={isRadio ? "radio" : "checkbox"}
                  name={isRadio ? `modifier-group-${group.id}` : undefined}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onToggle(mod.id)}
                  className="w-5 h-5 accent-[var(--rsc-main)]"
                />
                <span className="text-sm text-gray-700">{mod.name}</span>
              </div>
              {mod.priceDeltaMinor > 0 && (
                <span className="text-sm font-medium text-gray-500 flex-shrink-0">
                  +{formatNaira(mod.priceDeltaMinor)}
                </span>
              )}
            </label>
          );
        })}
      </div>

      {!isRadio && group.maxSelections > 1 && (
        <p className="text-xs text-gray-400 mt-2">Choose up to {group.maxSelections}</p>
      )}
    </div>
  );
}

export function ItemDetailModal({ item, outletName, onClose }: ItemDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [preparationNote, setPreparationNote] = useState("");
  const [debouncedPreparationNote, setDebouncedPreparationNote] = useState("");
  const [isPreparationFocused, setIsPreparationFocused] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPreparationNote(preparationNote.trim()), 700);
    return () => clearTimeout(timer);
  }, [preparationNote]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const { data: preparationSuggestions = [] } = useQuery({
    queryKey: ["preparation-suggestions", item.outletId, item.id, debouncedPreparationNote],
    queryFn: () =>
      apiClient.listPreparationSuggestions({
        outletId: item.outletId,
        menuItemId: item.id,
        q: debouncedPreparationNote,
      }),
    enabled: isPreparationFocused && debouncedPreparationNote.length >= 3,
    staleTime: 5 * 60_000,
  });
  // groupId → Set of selected modifierIds
  const [selections, setSelections] = useState<Map<string, Set<string>>>(() => new Map());
  const addItem = useCartStore((s) => s.addItem);

  function toggle(group: DisplayModifierGroup, modifierId: string) {
    setSelections((prev) => {
      const next = new Map(prev);
      const current = new Set(next.get(group.id) ?? []);

      if (group.maxSelections === 1) {
        current.clear();
        if (!prev.get(group.id)?.has(modifierId)) current.add(modifierId);
      } else {
        if (current.has(modifierId)) {
          current.delete(modifierId);
        } else if (current.size < group.maxSelections) {
          current.add(modifierId);
        }
      }

      next.set(group.id, current);
      return next;
    });
  }

  const extrasTotal = item.modifierGroups
    .flatMap((g) => g.modifiers.filter((m) => selections.get(g.id)?.has(m.id)))
    .reduce((sum, m) => sum + m.priceDeltaMinor, 0);

  const unitPrice = item.priceMinor + extrasTotal;
  const total = unitPrice * quantity;

  // Only check groups that are required AND have at least one selectable modifier.
  // Groups with all modifiers unavailable are skipped — they can't be fulfilled.
  const requiredGroups = item.modifierGroups.filter((g) => g.isRequired && g.modifiers.length > 0);
  const unmetGroups = requiredGroups.filter(
    (g) => (selections.get(g.id)?.size ?? 0) < g.minSelections,
  );
  const allRequiredMet = unmetGroups.length === 0;
  const visiblePreparationSuggestions = preparationSuggestions.slice(0, 6);

  function handleAddToCart() {
    const selectedModifiers = item.modifierGroups.flatMap((g) =>
      g.modifiers.filter((m) => selections.get(g.id)?.has(m.id)),
    );
    const note = preparationNote.trim();

    addItem({
      outletId: item.outletId,
      outletName,
      item: {
        id: item.id,
        name: item.name,
        notes: note,
        quantity,
        unitPriceMinor: unitPrice,
        modifiers: selectedModifiers.map((m) => ({ modifierId: m.id })),
      },
    });
    onClose();
  }

  function applyPreparationSuggestion(text: string) {
    setPreparationNote(text);
    setDebouncedPreparationNote(text);
    setIsPreparationFocused(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header image */}
        <div
          className="relative h-52 flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: item.bgColor }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close item details"
            className="absolute left-4 top-4 z-10 inline-flex h-10 items-center gap-2 rounded-full bg-white/95 px-3 text-sm font-bold text-gray-700 shadow-lg backdrop-blur transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rsc-brand)] md:right-4 md:left-auto md:w-10 md:justify-center md:px-0"
          >
            <X className="h-5 w-5" aria-hidden="true" />
            <span className="md:sr-only">Close</span>
          </button>

          {item.image.startsWith("/") || item.image.startsWith("http") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-8xl">{item.image}</span>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Name + price */}
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold text-gray-900">{item.name}</h2>
            <span className="text-xl font-bold flex-shrink-0" style={{ color: "var(--rsc-dark)" }}>
              {formatNaira(item.priceMinor)}
            </span>
          </div>

          {item.description && <p className="text-sm text-gray-500">{item.description}</p>}

          {/* Modifier groups */}
          {item.modifierGroups.map((group) => (
            <ModifierGroupSection
              key={group.id}
              group={group}
              selections={selections.get(group.id) ?? new Set()}
              onToggle={(modifierId) => toggle(group, modifierId)}
            />
          ))}

          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <label htmlFor={`prep-note-${item.id}`} className="text-sm font-bold text-gray-900">
              Preparation instruction
            </label>
            <p className="mt-1 text-xs text-gray-400">
              Add item-specific notes like extra spicy, no onions, or sauce on the side.
            </p>
            <div
              className={`mt-3 overflow-hidden rounded-xl border bg-gray-50 transition-colors ${
                isPreparationFocused ? "border-[var(--rsc-main)] bg-white" : "border-gray-200"
              }`}
            >
              <textarea
                id={`prep-note-${item.id}`}
                value={preparationNote}
                onFocus={() => setIsPreparationFocused(true)}
                onBlur={() => setTimeout(() => setIsPreparationFocused(false), 120)}
                onChange={(event) => setPreparationNote(event.target.value)}
                rows={3}
                maxLength={240}
                placeholder="e.g. Extra spicy, no onions"
                className="w-full resize-none border-0 bg-transparent px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
              />

              {isPreparationFocused && visiblePreparationSuggestions.length > 0 && (
                <div className="border-t border-orange-100 bg-white">
                  {visiblePreparationSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => applyPreparationSuggestion(suggestion.text)}
                      className="block w-full border-t border-gray-50 px-4 py-3 text-left text-sm font-semibold text-gray-700 first:border-t-0 hover:bg-orange-50 hover:text-orange-700"
                    >
                      {suggestion.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="p-4 border-t border-gray-100 flex-shrink-0 space-y-2">
          <div className="flex items-center gap-4">
            {/* Quantity */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-full border-2 flex items-center justify-center text-lg font-bold transition-colors"
                style={{ borderColor: "var(--rsc-dark)", color: "var(--rsc-dark)" }}
              >
                −
              </button>
              <span className="text-base font-bold w-5 text-center">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-9 h-9 rounded-full border-2 flex items-center justify-center text-lg font-bold transition-colors"
                style={{ borderColor: "var(--rsc-dark)", color: "var(--rsc-dark)" }}
              >
                +
              </button>
            </div>

            {/* Add to cart */}
            <Button tone="navy" fullWidth onClick={handleAddToCart} disabled={!allRequiredMet}>
              Add to Unified Cart &nbsp;·&nbsp; {formatNaira(total)}
            </Button>
          </div>

          {unmetGroups.length > 0 && (
            <p className="text-xs text-center text-amber-600">
              Please select {unmetGroups.map((g) => g.name).join(" and ")} to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
