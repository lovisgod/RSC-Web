"use client";

import { Card } from "@rsc/ui";

import {
  cartSubtotalMinor,
  formatNaira,
  itemLabel,
  outletSubtotalMinor,
} from "@/src/lib/data/cart";
import { useCart } from "@/src/hooks/use-cart";

export function CheckoutSidebar() {
  const { data: cart } = useCart();

  if (!cart) return null;

  const subtotal = cartSubtotalMinor(cart);

  return (
    <Card style={{ padding: 0 }} className="overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <h3 className="font-bold text-gray-900">Order summary</h3>
        <p className="text-xs text-gray-400 mt-0.5">One payment, split kitchen fulfillment.</p>
      </div>

      <div className="p-5 divide-y divide-gray-100">
        {cart.groups.map((group) => (
          <div key={group.outletId} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-gray-900">{group.outletName}</p>
                {group.items.map((item) => (
                  <p key={item.id} className="text-xs text-gray-400 mt-0.5">
                    {itemLabel(item)}
                  </p>
                ))}
              </div>
              <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
                {formatNaira(outletSubtotalMinor(group))}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-5 border-t border-gray-100 space-y-1.5">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Subtotal</span>
          <span className="font-medium text-gray-900">{formatNaira(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>Delivery</span>
          <span className="font-medium text-gray-900">{formatNaira(cart.deliveryFeeMinor)}</span>
        </div>
      </div>
    </Card>
  );
}
