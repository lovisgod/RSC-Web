"use client";

import { Button } from "@rsc/ui";
import { AlertCircle, ExternalLink } from "lucide-react";

import { formatNaira } from "@/src/lib/data/cart";

export function PaymentStep({
  checkoutUrl,
  totalMinor,
  onBack,
}: {
  checkoutUrl: string | null;
  totalMinor: number | null;
  onBack: () => void;
}) {
  const isProviderUnavailable = !checkoutUrl;

  function handleContinue() {
    if (!checkoutUrl) return;

    window.location.assign(checkoutUrl);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Payment</p>
          <h2 className="mt-1 text-lg font-bold text-gray-900">
            {checkoutUrl ? "Continue to secure payment" : "Payment unavailable"}
          </h2>
        </div>
        {totalMinor !== null && (
          <span className="text-xl font-bold text-gray-900">{formatNaira(totalMinor)}</span>
        )}
      </div>

      <div className="space-y-5 p-5">
        {isProviderUnavailable ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Payment provider currently unavailable.
                </p>
                <p className="mt-1 text-sm leading-relaxed text-amber-800">
                  Your order has been created. Please use Make payment under Active orders to
                  continue when the payment gateway is ready.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-gray-500">
            We have prepared your order. Continue to the payment gateway to complete payment
            securely.
          </p>
        )}

        {!isProviderUnavailable && (
          <Button tone="navy" fullWidth type="button" onClick={handleContinue}>
            <span className="inline-flex items-center justify-center gap-2">
              Continue to payment
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </span>
          </Button>
        )}

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
