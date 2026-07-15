"use client";

import { CheckCircle2, XCircle } from "lucide-react";

export function PaymentResultModal({ status }: { status: "SUCCESS" | "FAILED" }) {
  const isSuccess = status === "SUCCESS";
  const Icon = isSuccess ? CheckCircle2 : XCircle;

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            isSuccess
              ? "bg-[color-mix(in_srgb,var(--rsc-brand)_14%,white)] text-[var(--rsc-brand)]"
              : "bg-red-50 text-red-600"
          }`}
        >
          <Icon className="h-9 w-9" aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-gray-950">
          {isSuccess ? "Payment successful" : "Payment failed"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          {isSuccess
            ? "Your order has been confirmed. Taking you to live tracking in 5 seconds."
            : "Your cart is still intact. Taking you back to cart in 5 seconds so you can try again."}
        </p>
        <div
          className={`mx-auto mt-5 h-1.5 w-28 rounded-full ${
            isSuccess ? "bg-[var(--rsc-brand)]" : "bg-red-500"
          }`}
          aria-hidden="true"
        >
          <span className="sr-only">Redirecting in 5 seconds</span>
        </div>
      </div>
    </div>
  );
}
