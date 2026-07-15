"use client";

import { Card } from "@rsc/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { apiClient } from "@/src/lib/api";
import { useCartStore } from "@/src/stores/cart-store";
import { PaymentResultModal } from "./payment-result-modal";

export function PaymentReturnView({ reference }: { reference: string | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearCart = useCartStore((state) => state.clear);
  const handledRef = useRef(false);

  const paymentVerification = useQuery({
    queryKey: ["payment", "verify", reference],
    queryFn: async () => {
      const result = await apiClient.verifyPayment(reference!);
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      return result;
    },
    enabled: Boolean(reference),
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const resultStatus =
    paymentVerification.data?.status === "SUCCESS" || paymentVerification.data?.status === "FAILED"
      ? paymentVerification.data.status
      : null;

  useEffect(() => {
    if (!reference) {
      router.replace("/tracking");
    }
  }, [reference, router]);

  useEffect(() => {
    if (!resultStatus || handledRef.current) return;

    handledRef.current = true;

    if (resultStatus === "SUCCESS") {
      clearCart();
    }

    const timeoutId = window.setTimeout(() => {
      router.replace(resultStatus === "SUCCESS" ? "/tracking" : "/cart");
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [clearCart, resultStatus, router]);

  if (resultStatus) {
    return <PaymentResultModal status={resultStatus} />;
  }

  return (
    <Card className="mx-auto max-w-md text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[color-mix(in_srgb,var(--rsc-main)_10%,white)] text-[var(--rsc-main)]">
        <RefreshCw
          className={`h-5 w-5 ${paymentVerification.isPending ? "animate-spin" : ""}`}
          aria-hidden="true"
        />
      </div>
      <h1 className="mt-4 text-xl font-bold text-gray-950">
        {paymentVerification.isError ? "Payment sync is taking longer" : "Confirming payment"}
      </h1>
      <p className="mt-2 text-sm leading-6 text-gray-500">
        {paymentVerification.isError
          ? "We could not confirm the payment immediately. You can refresh this page or check active orders shortly."
          : "Please hold on while we confirm your payment before opening live tracking."}
      </p>
      {paymentVerification.isError && (
        <button
          type="button"
          onClick={() => void paymentVerification.refetch()}
          className="mt-4 text-sm font-semibold text-[var(--rsc-main)] hover:underline"
        >
          Try again
        </button>
      )}
    </Card>
  );
}
