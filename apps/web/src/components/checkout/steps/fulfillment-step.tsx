"use client";

import { Button } from "@rsc/ui";
import { useState } from "react";

import { cartSubtotalMinor, formatNaira } from "@/src/lib/data/cart";
import {
  DEFAULT_DELIVERY,
  VAT_RATE,
  type DeliveryForm,
  type FulfillmentMode,
} from "@/src/lib/data/checkout";
import { useCart } from "@/src/hooks/use-cart";

function SectionLabel({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      {icon.startsWith("/") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} alt="" className="w-4 h-4 object-contain" />
      ) : (
        <span className="text-base">{icon}</span>
      )}
      <span
        className="text-xs font-bold uppercase tracking-widest"
        style={{ color: "var(--rsc-dark)" }}
      >
        {text}
      </span>
    </div>
  );
}

export function FulfillmentStep({
  initial,
  onComplete,
}: {
  initial: DeliveryForm;
  onComplete: (data: DeliveryForm) => void;
}) {
  const { data: cart } = useCart();

  const [mode, setMode] = useState<FulfillmentMode>(initial.mode);
  const [address, setAddress] = useState(initial.address);
  const [onBehalf, setOnBehalf] = useState(initial.onBehalf);
  const [instructions, setInstructions] = useState(initial.instructions);

  const subtotal = cart ? cartSubtotalMinor(cart) : 0;
  const deliveryFee = mode === "delivery" && cart ? cart.deliveryFeeMinor : 0;
  const vat = Math.round((subtotal + deliveryFee) * VAT_RATE);
  const grandTotal = subtotal + deliveryFee + vat;

  function handleSubmit() {
    onComplete({ mode, address, onBehalf, instructions });
  }

  return (
    <div className="space-y-6">
      {/* Delivery / Takeout toggle */}
      <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
        {(["delivery", "takeout"] as FulfillmentMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
              mode === m ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <span>{m === "delivery" ? "🚴" : "🛍️"}</span>
            <span className="capitalize">{m}</span>
          </button>
        ))}
      </div>

      {/* Delivery address — only shown in delivery mode */}
      {mode === "delivery" && (
        <div>
          <SectionLabel icon="/icons/png/round-pushpin_1f4cd.png" text="Delivery Address" />
          <div className="bg-blue-50 rounded-2xl p-4 space-y-3">
            {/* Address input */}
            <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-transparent focus-within:border-[var(--rsc-main)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/png/house_1f3e0.png"
                alt="Address"
                className="w-5 h-5 object-contain flex-shrink-0"
              />
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your delivery address"
                className="flex-1 text-sm bg-transparent focus:outline-none text-gray-700 placeholder:text-gray-400"
              />
            </div>

            {/* Use default address */}
            <Button
              tone="navy"
              fullWidth
              type="button"
              onClick={() => setAddress(DEFAULT_DELIVERY.address)}
            >
              Use Default Address
            </Button>

            {/* On behalf checkbox */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={onBehalf}
                onChange={(e) => setOnBehalf(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 accent-[var(--rsc-main)]"
              />
              <span className="text-sm text-gray-600">
                Order on behalf of someone inside geofence
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Preparation instructions */}
      <div>
        <SectionLabel icon="📝" text="Preparation Instructions" />
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={3}
          placeholder="e.g., Make the Cactus Suya extra spicy, no onions…"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 focus:border-[var(--rsc-main)] focus:outline-none resize-none"
        />
      </div>

      {/* Price breakdown — shown on mobile; desktop has the sidebar */}
      <div className="space-y-2 lg:hidden">
        <h3 className="font-bold text-gray-900 text-base">Price Breakdown</h3>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>{formatNaira(subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Delivery Fee</span>
            <span>{deliveryFee === 0 ? "₦0" : formatNaira(deliveryFee)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>VAT (7.5%)</span>
            <span>{formatNaira(vat)}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
            <span>Grand Total</span>
            <span style={{ color: "var(--rsc-dark)" }}>{formatNaira(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <Button tone="navy" fullWidth type="button" onClick={handleSubmit}>
        Proceed to Payment 🚀
      </Button>
    </div>
  );
}
