"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Minus, Plus, Trash2 } from "lucide-react";
import { Card } from "@rsc/ui";

import { formatNaira, outletSubtotalMinor, type CartOutletGroup } from "@/src/lib/data/cart";
import { useCartStore } from "@/src/stores/cart-store";

export function CartOutletGroupCard({ group }: { group: CartOutletGroup }) {
  const [open, setOpen] = useState(true);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const subtotal = outletSubtotalMinor(group);
  const totalItems = group.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <Card style={{ padding: 0 }} className="overflow-hidden">
      {/* Header — tap to expand/collapse */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-4 text-left"
      >
        <div>
          <h2 className="text-base font-bold text-gray-900">{group.outletName}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {totalItems} item{totalItems !== 1 ? "s" : ""}&nbsp;·&nbsp;{formatNaira(subtotal)}
          </p>
        </div>
        {open ? (
          <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {/* Expandable items */}
      {open && (
        <ul className="border-t border-gray-100 divide-y divide-gray-50">
          {group.items.map((item, index) => {
            const lineId = item.lineId ?? `${item.id}-${index}`;

            return (
              <li key={lineId} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{item.name}</p>
                  {item.notes && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{item.notes}</p>
                  )}
                  <p className="text-sm font-bold mt-1" style={{ color: "var(--rsc-dark)" }}>
                    {formatNaira(item.unitPriceMinor * item.quantity)}
                  </p>
                </div>

                {/* Quantity controls */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    aria-label={item.quantity <= 1 ? "Remove item" : "Decrease quantity"}
                    onClick={() =>
                      item.quantity <= 1
                        ? removeItem(group.outletId, lineId)
                        : updateQuantity(group.outletId, lineId, item.quantity - 1)
                    }
                    className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors"
                    style={
                      item.quantity <= 1
                        ? { borderColor: "var(--rsc-danger)", color: "var(--rsc-danger)" }
                        : { borderColor: "var(--rsc-main)", color: "var(--rsc-main)" }
                    }
                  >
                    {item.quantity <= 1 ? (
                      <Trash2 className="w-3.5 h-3.5" />
                    ) : (
                      <Minus className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <span className="text-sm font-bold w-5 text-center tabular-nums">
                    {item.quantity}
                  </span>

                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => updateQuantity(group.outletId, lineId, item.quantity + 1)}
                    className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors"
                    style={{ borderColor: "var(--rsc-main)", color: "var(--rsc-main)" }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
