"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

type PaymentStatus = "PROCESSING" | "COMPLETED" | "FAILED";

function pollPaymentStatus(): Promise<{ status: PaymentStatus }> {
  // TODO: replace with apiClient.getPaymentStatus(orderId)
  return new Promise((resolve) => setTimeout(() => resolve({ status: "COMPLETED" }), 3000));
}

export function PaymentProcessingModal({
  onSuccess,
  onFailed,
}: {
  onSuccess: () => void;
  onFailed: () => void;
}) {
  const { data } = useQuery({
    queryKey: ["payment-status"],
    queryFn: pollPaymentStatus,
    refetchInterval: (q) => (q.state.data?.status === "PROCESSING" ? 2000 : false),
  });

  useEffect(() => {
    if (data?.status === "COMPLETED") onSuccess();
    if (data?.status === "FAILED") onFailed();
  }, [data, onSuccess, onFailed]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-10 flex flex-col items-center gap-5 shadow-2xl max-w-xs w-full mx-4 text-center">
        <div
          className="w-14 h-14 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: "var(--rsc-main)", borderTopColor: "transparent" }}
        />
        <h3 className="text-lg font-bold text-gray-900">Processing payment…</h3>
        <p className="text-sm text-gray-400">
          Please don&apos;t close this window. This usually takes a few seconds.
        </p>
      </div>
    </div>
  );
}
