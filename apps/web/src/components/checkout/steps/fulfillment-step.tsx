"use client";

import { nigerianPhoneNumberSchema, type DeliveryAddressSummary } from "@rsc/contracts";
import { Button } from "@rsc/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Star, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { apiClient } from "@/src/lib/api";
import { getMutationErrorMessage } from "@/src/lib/api-error";
import { cartSubtotalMinor, formatNaira } from "@/src/lib/data/cart";
import {
  type DeliveryForm,
  type DeliveryZone,
  type FulfillmentMode,
  type OrderSnapshot,
} from "@/src/lib/data/checkout";
import type { GooglePlaceSuggestion } from "@/src/lib/google-places";
import { geocodeAddress } from "@/src/lib/geocoding";
import { useCart } from "@/src/hooks/use-cart";
import { useDeliveryAddresses } from "@/src/hooks/use-delivery-addresses";
import { useGooglePlacesAutocomplete } from "@/src/hooks/use-google-places-autocomplete";
import { useOutlets } from "@/src/hooks/use-outlets";
import { usePlatformCharges } from "@/src/hooks/use-platform-charges";

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
  onComplete: (
    data: DeliveryForm,
    orderId: string,
    snapshot: OrderSnapshot,
    checkoutUrl: string | null,
  ) => void;
}) {
  const { data: cart } = useCart();
  const { data: platformCharges } = usePlatformCharges();
  const { data: outlets = [] } = useOutlets();
  const outletById = new Map(outlets.map((o) => [o.id, o]));
  const qc = useQueryClient();

  const { data: savedAddresses = [] } = useDeliveryAddresses();
  const defaultAddress = savedAddresses.find((a) => a.isDefault) ?? null;

  const [mode, setMode] = useState<FulfillmentMode>(initial.mode);
  const [addressText, setAddressText] = useState(initial.address);
  const [onBehalf, setOnBehalf] = useState(initial.onBehalf);
  const [recipientPhone, setRecipientPhone] = useState(initial.recipientPhone);
  const [recipientPhoneError, setRecipientPhoneError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    initial.latitude != null && initial.longitude != null
      ? { latitude: initial.latitude, longitude: initial.longitude }
      : null,
  );
  const [zone, setZone] = useState<DeliveryZone | null>(initial.zone);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [showNoDefaultHint, setShowNoDefaultHint] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addressSuggestions = useGooglePlacesAutocomplete(addressText, mode === "delivery");

  const filteredAddresses = savedAddresses.filter((addr) => {
    if (!addressText.trim()) return true;
    const q = addressText.toLowerCase();
    return (
      addr.label.toLowerCase().includes(q) ||
      addr.addressLine.toLowerCase().includes(q) ||
      addr.city.toLowerCase().includes(q) ||
      addr.state.toLowerCase().includes(q)
    );
  });

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

  function resetValidation() {
    setZone(null);
    setLocationError(null);
    setSelectedSavedId(null);
    validateMutation.reset();
  }

  function selectSavedAddress(addr: DeliveryAddressSummary) {
    setSelectedSavedId(addr.id);
    setAddressText(`${addr.addressLine}, ${addr.city}, ${addr.state}`);
    setCoords({ latitude: addr.latitude, longitude: addr.longitude });
    setZone(null);
    setLocationError(null);
    setShowNoDefaultHint(false);
    setShowDropdown(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    validateMutation.mutate({ latitude: addr.latitude, longitude: addr.longitude });
  }

  function handleInputFocus() {
    setShowDropdown(true);
  }

  function handleInputBlur() {
    blurTimerRef.current = setTimeout(() => setShowDropdown(false), 150);
  }

  function handleDropdownMouseDown() {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
  }

  function handleUseDefault() {
    if (defaultAddress) {
      selectSavedAddress(defaultAddress);
    } else {
      setShowNoDefaultHint(true);
    }
  }

  function handleAddressChange(value: string) {
    setAddressText(value);
    setCoords(null);
    setSelectedSavedId(null);
    resetValidation();
    setShowNoDefaultHint(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim() || value.trim().length < 5) return;

    debounceRef.current = setTimeout(() => {
      void runGeocode(value.trim());
    }, 1500);
  }

  async function runGeocode(query: string) {
    setGeocoding(true);
    setLocationError(null);
    try {
      const result = await geocodeAddress(query);
      if (!result) {
        setGeocoding(false);
        setLocationError("Address not found. Try a more specific address.");
        return;
      }
      setGeocoding(false);
      handleResolvedAddress(result);
    } catch {
      setGeocoding(false);
      setLocationError("Geocoding failed. Please try again.");
    }
  }

  async function selectAddressSuggestion(suggestion: GooglePlaceSuggestion) {
    setGeocoding(true);
    setLocationError(null);
    try {
      const result = await addressSuggestions.selectSuggestion(suggestion);
      setGeocoding(false);
      if (!result) {
        setLocationError("Address not found. Try a more specific address.");
        return;
      }
      setAddressText(result.displayName || result.addressLine);
      setShowDropdown(false);
      handleResolvedAddress(result);
    } catch {
      setGeocoding(false);
      setLocationError("Could not load this address. Please pick another suggestion.");
    }
  }

  function handleResolvedAddress(result: {
    latitude: number;
    longitude: number;
    addressLine: string;
    city: string;
    state: string;
    label: string;
  }) {
    const { latitude, longitude, addressLine, city, state, label } = result;
    setCoords({ latitude, longitude });

    validateMutation.mutate(
      { latitude, longitude },
      {
        onSuccess: (data) => {
          if (!data.deliverable) return;
          const isAlreadySaved = savedAddresses.some(
            (address) =>
              Math.abs(address.latitude - latitude) < 0.0001 &&
              Math.abs(address.longitude - longitude) < 0.0001,
          );
          if (isAlreadySaved) return;
          void apiClient
            .createDeliveryAddress({
              label: label || addressLine.slice(0, 30),
              addressLine,
              city: city || "Lagos",
              state: state || "Lagos State",
              latitude,
              longitude,
              isDefault: savedAddresses.length === 0,
            })
            .then(() => qc.invalidateQueries({ queryKey: ["delivery-addresses"] }))
            .catch((err: unknown) => console.error("[address save]", err));
        },
      },
    );
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, []);

  const subtotal = cart ? cartSubtotalMinor(cart) : 0;
  const deliveryFee = mode === "delivery" && platformCharges ? platformCharges.deliveryFeeMinor : 0;
  const serviceFee = platformCharges?.serviceFeeMinor ?? 0;

  const vat = cart
    ? cart.groups.reduce((sum, group) => {
        const groupSubtotal = group.items.reduce((s, i) => s + i.unitPriceMinor * i.quantity, 0);
        const outletVatBps = outletById.get(group.outletId)?.vatBps ?? 0;
        const defaultVatBps = platformCharges?.defaultVatBps ?? 750;
        const vatBps = outletVatBps > 0 ? outletVatBps : defaultVatBps;
        return sum + Math.round((groupSubtotal * vatBps) / 10_000);
      }, 0)
    : 0;

  const platformCommission = cart
    ? cart.groups.reduce((sum, group) => {
        const groupSubtotal = group.items.reduce((s, i) => s + i.unitPriceMinor * i.quantity, 0);
        const commissionBps = platformCharges?.platformCommissionBps ?? 1000;
        return sum + Math.round((groupSubtotal * commissionBps) / 10_000);
      }, 0)
    : 0;

  const grandTotal = subtotal + deliveryFee + serviceFee + vat + platformCommission;

  const initiateMutation = useMutation({
    onError: (err) => {
      console.error("[initiatePayment error]", err);
    },
    mutationFn: () => {
      if (onBehalf) {
        const parsedPhone = nigerianPhoneNumberSchema.safeParse(recipientPhone);
        if (!parsedPhone.success) {
          throw new Error(parsedPhone.error.issues[0]?.message ?? "Enter a valid phone number.");
        }
      }

      const items = cart.groups.flatMap((g) =>
        g.items.map((item) => ({
          menuItemId: item.id,
          quantity: item.quantity,
          modifiers: item.modifiers ?? [],
          ...(item.notes ? { customerNote: item.notes } : {}),
        })),
      );

      if (items.length === 0) {
        throw new Error("Your cart is empty. Add items before placing an order.");
      }

      const base = {
        items,
        deliveryMode: mode === "delivery" ? ("DELIVERY" as const) : ("TAKEOUT" as const),
        ...(onBehalf ? { recipientPhone: recipientPhone.trim() } : {}),
        subtotalMinor: subtotal,
        deliveryFeeMinor: deliveryFee,
        serviceFeeMinor: serviceFee,
        vatMinor: vat,
        platformCommissionMinor: platformCommission,
        totalMinor: grandTotal,
      };

      return apiClient.initiatePayment(
        mode === "delivery"
          ? {
              ...base,
              deliveryAddress: addressText,
              deliveryLatitude: coords!.latitude,
              deliveryLongitude: coords!.longitude,
            }
          : base,
      );
    },
    onSuccess: (result) => {
      // Snapshot cart before clearing so the sidebar stays populated on later steps
      const snapshot: OrderSnapshot = {
        groups: cart.groups.map((g) => ({
          outletId: g.outletId,
          outletName: g.outletName,
          items: g.items.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            notes: item.notes,
            unitPriceMinor: item.unitPriceMinor,
          })),
        })),
        totals: result.totals,
      };
      onComplete(
        {
          mode,
          address: addressText,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          zone,
          onBehalf,
          recipientPhone,
          instructions: "",
        },
        result.reference,
        snapshot,
        result.checkoutUrl,
      );
    },
  });

  const isValidating = geocoding || addressSuggestions.isLoading || validateMutation.isPending;
  const isValidated = zone !== null;
  const cartItemCount = cart.groups.reduce((n, g) => n + g.items.length, 0);
  const canProceed = cartItemCount > 0 && (mode === "takeout" || isValidated);

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
            <span>{m === "delivery" ? "??" : "???"}</span>
            <span className="capitalize">{m}</span>
          </button>
        ))}
      </div>

      {/* Delivery address — only shown in delivery mode */}
      {mode === "delivery" && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <SectionLabel icon="/icons/png/round-pushpin_1f4cd.png" text="Delivery Address" />
            <button
              type="button"
              onClick={handleUseDefault}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                defaultAddress
                  ? "border-[var(--rsc-main)] text-[var(--rsc-main)] hover:bg-[var(--rsc-main)]/5"
                  : "border-gray-200 text-gray-400"
              }`}
            >
              <Star className="w-3 h-3" fill={defaultAddress ? "currentColor" : "none"} />
              {defaultAddress ? `Use ${defaultAddress.label}` : "No Default Set"}
            </button>
          </div>

          <div className="bg-blue-50 rounded-2xl p-4 space-y-3">
            {/* No-default hint */}
            {showNoDefaultHint && !defaultAddress && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
                Type your address below — once verified it will be saved as your default.
              </div>
            )}

            {/* Address combobox */}
            <div className="relative">
              <div
                className={`flex items-center gap-3 bg-white rounded-xl px-4 py-3 border transition-colors ${
                  isValidated
                    ? "border-green-400"
                    : locationError
                      ? "border-red-300"
                      : "border-transparent focus-within:border-[var(--rsc-main)]"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/png/house_1f3e0.png"
                  alt="Address"
                  className="w-5 h-5 object-contain flex-shrink-0"
                />
                <input
                  value={addressText}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder="e.g. 8 Abiola Sanusi Street, off Admiralty Way"
                  className="flex-1 text-sm bg-transparent focus:outline-none text-gray-700 placeholder:text-gray-400"
                />
                {isValidating && (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400 flex-shrink-0" />
                )}
                {isValidated && !isValidating && (
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                )}
              </div>

              {/* Address dropdown */}
              {showDropdown &&
                (filteredAddresses.length > 0 || addressSuggestions.suggestions.length > 0) && (
                  <div
                    onMouseDown={handleDropdownMouseDown}
                    className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden"
                  >
                    {filteredAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => selectSavedAddress(addr)}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                          selectedSavedId === addr.id ? "bg-[var(--rsc-main)]/5" : ""
                        }`}
                      >
                        <span className="mt-0.5 flex-shrink-0 text-gray-400">
                          {addr.isDefault ? (
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src="/icons/png/round-pushpin_1f4cd.png"
                              alt=""
                              className="w-4 h-4 object-contain"
                            />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {addr.label}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {addr.addressLine}, {addr.city}
                          </p>
                        </div>
                      </button>
                    ))}
                    {addressSuggestions.suggestions.map((suggestion) => (
                      <button
                        key={`${suggestion.provider}:${suggestion.id}`}
                        type="button"
                        onClick={() => void selectAddressSuggestion(suggestion)}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/icons/png/round-pushpin_1f4cd.png"
                          alt=""
                          className="w-4 h-4 object-contain mt-0.5 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {suggestion.description}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {suggestion.provider === "google"
                              ? "Google exact address"
                              : "Address match"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
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
            {!isValidated && !locationError && !isValidating && !addressText && (
              <p className="text-xs text-center text-gray-400">
                Include your house number, street name and a nearby route, if needed.
              </p>
            )}

            {geocoding && (
              <p className="text-xs text-center text-gray-400">Finding your address…</p>
            )}

            {/* On behalf checkbox */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={onBehalf}
                onChange={(e) => {
                  setOnBehalf(e.target.checked);
                  setRecipientPhoneError(null);
                  if (!e.target.checked) setRecipientPhone("");
                }}
                className="w-4 h-4 rounded border-gray-300 accent-[var(--rsc-main)]"
              />
              <span className="text-sm text-gray-600">Order on behalf of some else</span>
            </label>

            {onBehalf && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500">
                  Recipient phone number
                </label>
                <input
                  type="tel"
                  value={recipientPhone}
                  onChange={(event) => {
                    setRecipientPhone(event.target.value);
                    setRecipientPhoneError(null);
                  }}
                  onBlur={() => {
                    if (!recipientPhone.trim()) {
                      setRecipientPhoneError("Recipient phone number is required.");
                      return;
                    }

                    const parsedPhone = nigerianPhoneNumberSchema.safeParse(recipientPhone);
                    setRecipientPhoneError(
                      parsedPhone.success
                        ? null
                        : (parsedPhone.error.issues[0]?.message ?? "Enter a valid phone number."),
                    );
                  }}
                  placeholder="08031234567"
                  aria-invalid={Boolean(recipientPhoneError)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 focus:border-[var(--rsc-main)] focus:outline-none"
                />
                {recipientPhoneError && (
                  <p className="text-xs text-red-500">{recipientPhoneError}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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
            <span>{deliveryFee === 0 ? "?0" : formatNaira(deliveryFee)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>VAT</span>
            <span>{formatNaira(vat)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Platform Commission</span>
            <span>{formatNaira(platformCommission)}</span>
          </div>
          {serviceFee > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>Service Fee</span>
              <span>{formatNaira(serviceFee)}</span>
            </div>
          )}
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
          onClick={() => {
            if (onBehalf) {
              const parsedPhone = nigerianPhoneNumberSchema.safeParse(recipientPhone);
              if (!parsedPhone.success) {
                setRecipientPhoneError(
                  parsedPhone.error.issues[0]?.message ?? "Enter a valid phone number.",
                );
                return;
              }
            }

            initiateMutation.mutate();
          }}
          disabled={!canProceed || initiateMutation.isPending}
        >
          {initiateMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Placing order…
            </span>
          ) : (
            "Proceed to Payment ??"
          )}
        </Button>
      </div>
    </div>
  );
}
