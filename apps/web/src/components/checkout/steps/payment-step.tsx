"use client";

import { Button } from "@rsc/ui";
import { ExternalLink } from "lucide-react";

import { formatNaira } from "@/src/lib/data/cart";

export function PaymentStep({
  checkoutUrl,
  totalMinor,
  onBack,
  onSuccess,
}: {
  checkoutUrl: string | null;
  totalMinor: number | null;
  onBack: () => void;
  onSuccess: () => void;
}) {
  function handleContinue() {
    if (checkoutUrl) {
      window.location.assign(checkoutUrl);
      return;
    }

    onSuccess();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Payment</p>
          <h2 className="mt-1 text-lg font-bold text-gray-900">
            {checkoutUrl ? "Continue to secure payment" : "Order received"}
          </h2>
        </div>
        {totalMinor !== null && (
          <span className="text-xl font-bold text-gray-900">{formatNaira(totalMinor)}</span>
        )}
      </div>

      <div className="space-y-5 p-5">
        <p className="text-sm leading-relaxed text-gray-500">
          {checkoutUrl
            ? "We have prepared your order. Continue to the payment gateway to complete payment securely."
            : "Your order has been created. Payment gateway redirection is not available yet, so you can continue to confirmation."}
        </p>

        <Button tone="navy" fullWidth type="button" onClick={handleContinue}>
          {checkoutUrl ? (
            <span className="inline-flex items-center justify-center gap-2">
              Continue to payment
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </span>
          ) : (
            "Continue to confirmation"
          )}
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-gray-400 transition-colors hover:text-gray-600"
          >
            Back to outlets
          </button>
        </div>
      </div>
    </div>
  );
}
