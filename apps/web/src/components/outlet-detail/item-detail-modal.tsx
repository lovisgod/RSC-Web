"use client";

import { Button } from "@rsc/ui";
import { useState } from "react";

import { formatNaira } from "@/src/lib/data/cart";
import type { MenuItem } from "@/src/lib/data/outlet-menu";
import { useCartStore } from "@/src/stores/cart-store";

interface ItemDetailModalProps {
  item: MenuItem;
  outletName: string;
  onClose: () => void;
}

export function ItemDetailModal({ item, outletName, onClose }: ItemDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<Set<string>>(new Set());
  const addItem = useCartStore((s) => s.addItem);

  function toggleExtra(id: string) {
    setSelectedExtras((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const extrasTotal = (item.extras ?? [])
    .filter((e) => selectedExtras.has(e.id))
    .reduce((sum, e) => sum + e.priceMinor, 0);

  const unitPrice = item.priceMinor + extrasTotal;
  const total = unitPrice * quantity;

  function handleAddToCart() {
    const extrasLabel = (item.extras ?? [])
      .filter((e) => selectedExtras.has(e.id))
      .map((e) => e.name)
      .join(", ");

    addItem({
      outletId: item.outletId,
      outletName,
      item: {
        id: item.id,
        name: item.name,
        notes: extrasLabel,
        quantity,
        unitPriceMinor: unitPrice,
      },
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header image */}
        <div
          className="h-52 flex items-center justify-center text-8xl flex-shrink-0"
          style={{ backgroundColor: item.bgColor }}
        >
          {item.image.startsWith("/") || item.image.startsWith("http") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt={item.name} className="w-32 h-32 object-contain" />
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

          <p className="text-sm text-gray-500">{item.description}</p>

          {/* Note */}
          {item.note && (
            <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              <p className="text-sm text-green-700">{item.note}</p>
            </div>
          )}

          {/* Extras */}
          {item.extras && item.extras.length > 0 && (
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="flex justify-between mb-3">
                <span className="text-sm font-bold text-gray-900">Add Extras</span>
                <span className="text-xs text-gray-400 font-medium">Optional</span>
              </div>
              <div className="space-y-3">
                {item.extras.map((extra) => (
                  <label
                    key={extra.id}
                    className="flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedExtras.has(extra.id)}
                        onChange={() => toggleExtra(extra.id)}
                        className="w-4 h-4 rounded border-gray-300 accent-[var(--rsc-main)]"
                      />
                      <span className="text-sm text-gray-700">{extra.name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-500">
                      +{formatNaira(extra.priceMinor)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="p-4 border-t border-gray-100 flex items-center gap-4 flex-shrink-0">
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
          <Button tone="navy" fullWidth onClick={handleAddToCart}>
            Add to Unified Cart &nbsp;·&nbsp; {formatNaira(total)}
          </Button>
        </div>
      </div>
    </div>
  );
}
