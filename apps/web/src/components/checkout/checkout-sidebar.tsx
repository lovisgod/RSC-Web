"use client";

import { Card } from "@rsc/ui";

import {
  cartSubtotalMinor,
  formatNaira,
  itemLabel,
  outletSubtotalMinor,
} from "@/src/lib/data/cart";
import { type OrderSnapshot } from "@/src/lib/data/checkout";
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

export function CheckoutSidebar({ snapshot }: { snapshot: OrderSnapshot | null }) {
  const { data: cart } = useCart();
  const { data: charges } = usePlatformCharges();

  // Decide data source: live cart until payment is initiated, then snapshot
  const hasLiveItems = (cart?.groups.flatMap((g) => g.items).length ?? 0) > 0;
  const useSnapshot = !hasLiveItems && !!snapshot;

  if (!hasLiveItems && !snapshot) return null;

  if (useSnapshot) {
    // Use server-calculated totals from the initiatePayment response
    const { totals, groups } = snapshot;
    const vatPct = charges ? (charges.defaultVatBps / 100).toFixed(2).replace(/\.?0+$/, "") : "7.5";
    const commPct = charges
      ? (charges.platformCommissionBps / 100).toFixed(2).replace(/\.?0+$/, "")
      : "10";

    return (
      <Card style={{ padding: 0 }} className="overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Order summary</h3>
          <p className="text-xs text-gray-400 mt-0.5">One payment, split kitchen fulfillment.</p>
        </div>

        <div className="p-5 divide-y divide-gray-100">
          {groups.map((group) => (
            <div key={group.outletId} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-gray-900">{group.outletName}</p>
                  {group.items.map((item) => (
                    <p key={item.id} className="text-xs text-gray-400 mt-0.5">
                      {item.name}
                      {item.quantity > 1 ? ` x${item.quantity}` : ""}
                      {item.notes ? ` · ${item.notes}` : ""}
                    </p>
                  ))}
                </div>
                <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
                  {formatNaira(group.items.reduce((s, i) => s + i.unitPriceMinor * i.quantity, 0))}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-gray-100 space-y-2">
          <FeeLine label="Subtotal" value={formatNaira(totals.subtotalMinor)} />
          <FeeLine
            label="Delivery fee"
            value={totals.deliveryFeeMinor === 0 ? "Free" : formatNaira(totals.deliveryFeeMinor)}
          />
          <FeeLine label={`VAT (${vatPct}%)`} value={formatNaira(totals.vatMinor)} muted />
          {totals.serviceFeeMinor > 0 && (
            <FeeLine label="Service fee" value={formatNaira(totals.serviceFeeMinor)} muted />
          )}
          <div className="pt-2 border-t border-gray-100 flex justify-between">
            <span className="text-sm font-bold text-gray-900">Total</span>
            <span className="text-sm font-bold" style={{ color: "var(--rsc-main)" }}>
              {formatNaira(totals.totalMinor)}
            </span>
          </div>
        </div>
      </Card>
    );
  }

  // Live cart view (step 1 only)
  const subtotal = cartSubtotalMinor(cart!);
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

      <div className="p-5 divide-y divide-gray-100">
        {cart!.groups.map((group) => (
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
