import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RefundRequestListQuery } from "@rsc/contracts";

import { listRefundRequests, processPaymentRefund } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

const REFUND_REQUESTS_QUERY_KEY = ["admin", "finance", "refund-requests"] as const;

export function useRefundRequests(query: RefundRequestListQuery) {
  return useQuery({
    queryKey: [...REFUND_REQUESTS_QUERY_KEY, query],
    queryFn: () => listRefundRequests(query),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}

export function useProcessRefundRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reference,
      amountMinor,
      reason,
    }: {
      reference: string;
      amountMinor?: number;
      reason?: string;
    }) => processPaymentRefund(reference, { amountMinor, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFUND_REQUESTS_QUERY_KEY });
      toastBus.emit("Refund processed", "success");
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });
}
