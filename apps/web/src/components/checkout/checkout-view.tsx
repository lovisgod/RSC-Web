"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { type DeliveryForm, type OrderSnapshot } from "@/src/lib/data/checkout";
import { CheckoutProgress } from "@/src/components/checkout/checkout-progress";
import { CheckoutSidebar } from "@/src/components/checkout/checkout-sidebar";
import { FulfillmentStep } from "@/src/components/checkout/steps/fulfillment-step";
import { PaymentStep } from "@/src/components/checkout/steps/payment-step";
import { ConfirmationStep } from "@/src/components/checkout/steps/confirmation-step";

const EMPTY_DELIVERY: DeliveryForm = {
  mode: "delivery",
  address: "",
  latitude: null,
  longitude: null,
  zone: null,
  onBehalf: false,
  recipientPhone: "",
  instructions: "",
};

type Step = 1 | 2 | 3;

const STEP_TO_PROGRESS: Record<Step, number> = { 1: 1, 2: 2, 3: 3 };

export function CheckoutView() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [delivery, setDelivery] = useState<DeliveryForm>(EMPTY_DELIVERY);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<OrderSnapshot | null>(null);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        {step === 1 && (
          <button
            type="button"
            onClick={() => router.push("/cart")}
            aria-label="Go back"
            className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm flex-shrink-0"
          >
            ←
          </button>
        )}
        <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
      </div>

      {/* Progress */}
      <CheckoutProgress current={STEP_TO_PROGRESS[step]} />

      {/* Content + sidebar */}
      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:gap-8">
        {/* Main step */}
        <div className="w-full max-w-xl min-w-0 lg:max-w-none lg:flex-1">
          {step === 1 && (
            <FulfillmentStep
              initial={delivery}
              onModeChange={(mode) => setDelivery((current) => ({ ...current, mode }))}
              onComplete={(d, id, snap, url) => {
                setDelivery(d);
                setOrderId(id);
                setCheckoutUrl(url);
                setSnapshot(snap);
                setStep(2);
              }}
            />
          )}

          {step === 2 && (
            <PaymentStep
              checkoutUrl={checkoutUrl}
              totalMinor={snapshot?.totals.totalMinor ?? null}
              onBack={() => router.push("/outlets")}
            />
          )}

          {step === 3 && <ConfirmationStep orderId={orderId ?? ""} />}
        </div>

        {/* Order summary sidebar — always visible, uses snapshot once cart is cleared */}
        <div className="w-full max-w-xl lg:sticky lg:top-20 lg:w-[340px] lg:max-w-none">
          <CheckoutSidebar mode={delivery.mode} snapshot={snapshot} />
        </div>
      </div>
    </div>
  );
}
