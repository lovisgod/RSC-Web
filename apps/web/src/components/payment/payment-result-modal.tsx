"use client";

import { CheckCircle2, XCircle } from "lucide-react";

export function PaymentResultModal({ status }: { status: "SUCCESS" | "FAILED" }) {
  const isSuccess = status === "SUCCESS";
  const Icon = isSuccess ? CheckCircle2 : XCircle;

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 p-8 text-center shadow-2xl transition-colors">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            isSuccess
              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 border border-emerald-500/20"
              : "bg-red-50 dark:bg-red-950/60 text-red-500 border border-red-500/20"
          }`}
        >
          <Icon className="h-9 w-9" aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-gray-900 dark:text-white">
          {isSuccess ? "Payment successful" : "Payment failed"}
        </h2>
        <p className="mt-2.5 text-sm leading-6 text-gray-600 dark:text-gray-300">
          {isSuccess
            ? "Your order has been confirmed. Taking you to live tracking in 5 seconds."
            : "Your cart is still intact. Taking you back to cart in 5 seconds so you can try again."}
        </p>
        <div
          className={`mx-auto mt-6 h-1.5 w-28 rounded-full ${
            isSuccess ? "bg-emerald-500" : "bg-red-500"
          }`}
          aria-hidden="true"
        >
          <span className="sr-only">Redirecting in 5 seconds</span>
        </div>
      </div>
    </div>
  );
}
