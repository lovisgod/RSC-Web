"use client";

import { Button } from "@rsc/ui";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2, MapPin, XCircle } from "lucide-react";
import { useState } from "react";

import { apiClient } from "@/src/lib/api";
import { getMutationErrorMessage } from "@/src/lib/api-error";
import { cartSubtotalMinor, formatNaira } from "@/src/lib/data/cart";
import {
  VAT_RATE,
  type DeliveryForm,
  type DeliveryZone,
  type FulfillmentMode,
} from "@/src/lib/data/checkout";
import { useCart } from "@/src/hooks/use-cart";
import { useAddressStore } from "@/src/stores/address-store";

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
  onComplete: (data: DeliveryForm, orderId: string) => void;
}) {
  const { data: cart } = useCart();
  const savedDefault = useAddressStore((s) => s.defaultAddress);

  const [mode, setMode] = useState<FulfillmentMode>(initial.mode);
  const [address, setAddress] = useState(initial.address);
  const [onBehalf, setOnBehalf] = useState(initial.onBehalf);
  const [instructions, setInstructions] = useState(initial.instructions);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    initial.latitude != null && initial.longitude != null
      ? { latitude: initial.latitude, longitude: initial.longitude }
      : null,
  );
  const [zone, setZone] = useState<DeliveryZone | null>(initial.zone);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const validateMutation = useMutation({
    mutationFn: (input: { latitude: number; longitude: number }) =>
      apiClient.validateAddress(input),
    onSuccess: (data) => {
      if (data.deliverable && data.zone) {
        setZone(data.zone);
        setLocationError(null);
      } else {
        setZone(null);
        setLocationError("Sorry, we don't deliver to your location yet.");
      }
    },
    onError: () => {
      setZone(null);
      setLocationError("Could not validate your address. Please try again.");
    },
  });

  function handleDetectLocation() {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    setLocating(true);
    setLocationError(null);
    setZone(null);
    validateMutation.reset();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ latitude, longitude });
        setLocating(false);
        validateMutation.mutate({ latitude, longitude });
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError(
            "Location access denied. Please enable location permissions and try again.",
          );
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError("Your location could not be determined. Please try again.");
        } else {
          setLocationError("Location request timed out. Please try again.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  const subtotal = cart ? cartSubtotalMinor(cart) : 0;
  const deliveryFee = mode === "delivery" && cart ? cart.deliveryFeeMinor : 0;
  const vat = Math.round((subtotal + deliveryFee) * VAT_RATE);
  const grandTotal = subtotal + deliveryFee + vat;

  const initiateMutation = useMutation({
    mutationFn: () => {
      const items = cart
        ? cart.groups.flatMap((g) =>
            g.items.map((item) => ({
              menuItemId: item.id,
              quantity: item.quantity,
              modifiers: item.modifiers,
              ...(item.notes ? { customerNote: item.notes } : {}),
            })),
          )
        : [];

      const base = {
        items,
        deliveryMode: mode === "delivery" ? ("DELIVERY" as const) : ("TAKEOUT" as const),
      };

      return apiClient.initiatePayment(
        mode === "delivery"
          ? {
              ...base,
              deliveryAddress: address,
              deliveryLatitude: coords!.latitude,
              deliveryLongitude: coords!.longitude,
            }
          : base,
      );
    },
    onSuccess: (result) => {
      onComplete(
        {
          mode,
          address,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          zone,
          onBehalf,
          instructions,
        },
        result.reference,
      );
    },
  });

  const isDetecting = locating || validateMutation.isPending;
  const isValidated = zone !== null;
  const canProceed = mode === "takeout" || isValidated;

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
            {/* Address text input */}
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

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                tone="quiet"
                fullWidth
                type="button"
                disabled={!savedDefault}
                onClick={() => {
                  if (!savedDefault) return;
                  setAddress(
                    `${savedDefault.addressLine}, ${savedDefault.city}, ${savedDefault.state}`,
                  );
                  setCoords({
                    latitude: savedDefault.latitude,
                    longitude: savedDefault.longitude,
                  });
                  setZone(null);
                  setLocationError(null);
                  validateMutation.mutate({
                    latitude: savedDefault.latitude,
                    longitude: savedDefault.longitude,
                  });
                }}
              >
                {savedDefault ? `Use ${savedDefault.label}` : "No Default Set"}
              </Button>

              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isDetecting}
                className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: "var(--rsc-main)" }}
              >
                {isDetecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {locating ? "Locating…" : "Validating…"}
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4" />
                    Use My Location
                  </>
                )}
              </button>
            </div>

            {/* Validation success */}
            {isValidated && zone && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Deliverable</p>
                  <p className="text-xs text-green-600 mt-0.5">{zone.name} zone</p>
                </div>
              </div>
            )}

            {/* Validation error */}
            {locationError && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 leading-relaxed">{locationError}</p>
              </div>
            )}

            {/* Idle hint */}
            {!isValidated && !locationError && !isDetecting && (
              <p className="text-xs text-center text-gray-400">
                Tap &quot;Use My Location&quot; to confirm your delivery zone
              </p>
            )}

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

      {/* Price breakdown — mobile only */}
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
      <div className="space-y-2">
        {mode === "delivery" && !isValidated && !initiateMutation.isPending && (
          <p className="text-xs text-center text-gray-400">
            Validate your delivery location to continue
          </p>
        )}
        {initiateMutation.isError && (
          <p className="text-xs text-center text-red-500">
            {getMutationErrorMessage(initiateMutation.error, {})}
          </p>
        )}
        <Button
          tone="navy"
          fullWidth
          type="button"
          onClick={() => initiateMutation.mutate()}
          disabled={!canProceed || initiateMutation.isPending}
        >
          {initiateMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Placing order…
            </span>
          ) : (
            "Proceed to Payment 🚀"
          )}
        </Button>
      </div>
    </div>
  );
}
