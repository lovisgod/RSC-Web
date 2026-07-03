"use client";

import { Card } from "@rsc/ui";

import {
  cartSubtotalMinor,
  formatNaira,
  itemLabel,
  outletSubtotalMinor,
} from "@/src/lib/data/cart";
import { useCart } from "@/src/hooks/use-cart";
import { usePlatformCharges, calcCharges } from "@/src/hooks/use-platform-charges";

function FeeLine({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${muted ? "text-gray-400" : "text-gray-500"}`}>
      <span>{label}</span>
      <span className={`font-medium ${muted ? "text-gray-400" : "text-gray-900"}`}>{value}</span>
    </div>
  );
}

export function CheckoutSidebar() {
  const { data: cart } = useCart();
  const { data: charges } = usePlatformCharges();

  if (!cart) return null;

  const subtotal = cartSubtotalMinor(cart);
  const fees = charges ? calcCharges(subtotal, charges) : null;

  const vatPct = charges ? (charges.defaultVatBps / 100).toFixed(2).replace(/\.?0+$/, "") : null;
  const commPct = charges
    ? (charges.platformCommissionBps / 100).toFixed(2).replace(/\.?0+$/, "")
    : null;

  return (
    <Card style={{ padding: 0 }} className="overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <h3 className="font-bold text-gray-900">Order summary</h3>
        <p className="text-xs text-gray-400 mt-0.5">One payment, split kitchen fulfillment.</p>
      </div>

      {/* Items per outlet */}
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

      {/* Fee breakdown */}
      <div className="p-5 border-t border-gray-100 space-y-2">
        <FeeLine label="Subtotal" value={formatNaira(subtotal)} />

        {fees ? (
          <>
            <FeeLine
              label="Delivery fee"
              value={fees.delivery === 0 ? "Free" : formatNaira(fees.delivery)}
            />
            <FeeLine label={`VAT (${vatPct}%)`} value={formatNaira(fees.vat)} muted />
            <FeeLine
              label={`Platform commission (${commPct}%)`}
              value={formatNaira(fees.commission)}
              muted
            />
            {fees.service > 0 && (
              <FeeLine label="Service fee" value={formatNaira(fees.service)} muted />
            )}
            <div className="pt-2 border-t border-gray-100 flex justify-between">
              <span className="text-sm font-bold text-gray-900">Total</span>
              <span className="text-sm font-bold" style={{ color: "var(--rsc-main)" }}>
                {formatNaira(fees.total)}
              </span>
            </div>
          </>
        ) : (
          // charges still loading — show skeleton rows
          <>
            <FeeLine label="Delivery fee" value="—" />
            <FeeLine label="VAT" value="—" muted />
            <FeeLine label="Platform commission" value="—" muted />
          </>
        )}
      </div>
    </Card>
  );
}
