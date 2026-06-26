"use client";

import { Button } from "@rsc/ui";
import { useState } from "react";

import { inputClass } from "@/src/lib/form-styles";

const INFO_ROWS = [
  { label: "Delivery ETA", value: "35–45 min" },
  { label: "Refund policy", value: "Eligible before kitchens accept" },
  { label: "Support", value: "24/7 chat and phone" },
];

export function ReviewStep({
  onBack,
  onContinue,
}: {
  onBack: () => void;
  onContinue: (promo: string) => void;
}) {
  const [promo, setPromo] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");

  function applyPromo() {
    // TODO: validate with apiClient.validatePromo(promo)
    if (promo.trim()) setAppliedPromo(promo.trim().toUpperCase());
  }

  return (
    <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Review before payment</h2>

      {/* Info rows */}
      <div className="divide-y divide-gray-100">
        {INFO_ROWS.map((row) => (
          <div key={row.label} className="flex justify-between py-4 text-sm">
            <span className="text-gray-500">{row.label}</span>
            <span className="font-medium text-gray-900">{row.value}</span>
          </div>
        ))}

        {appliedPromo && (
          <div className="flex justify-between py-4 text-sm">
            <span className="text-gray-500">Promo</span>
            <span className="font-medium" style={{ color: "var(--rsc-main)" }}>
              {appliedPromo} applied
            </span>
          </div>
        )}
      </div>

      {/* Promo code */}
      <div className="flex gap-2">
        <input
          value={promo}
          onChange={(e) => setPromo(e.target.value)}
          placeholder="Promo code"
          className={`${inputClass} flex-1`}
        />
        <button
          type="button"
          onClick={applyPromo}
          className="flex-shrink-0 px-5 rounded-xl border-2 text-sm font-semibold transition-colors hover:bg-gray-50"
          style={{ borderColor: "var(--rsc-main)", color: "var(--rsc-main)" }}
        >
          Apply
        </button>
      </div>

      <div className="flex gap-3">
        <Button tone="quiet" type="button" onClick={onBack}>
          Back
        </Button>
        <Button tone="primary" fullWidth type="button" onClick={() => onContinue(appliedPromo)}>
          Continue to payment
        </Button>
      </div>
    </div>
  );
}
