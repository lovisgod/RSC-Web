import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { approveOutletSettlement, listOutletSettlements } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

const OUTLET_SETTLEMENTS_QUERY_KEY = ["admin", "finance", "outlet-settlements"] as const;

export function useOutletSettlements() {
  return useQuery({
    queryKey: OUTLET_SETTLEMENTS_QUERY_KEY,
    queryFn: () => listOutletSettlements(),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}

export function useApproveOutletSettlement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveOutletSettlement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OUTLET_SETTLEMENTS_QUERY_KEY });
      toastBus.emit("Settlement approved", "success");
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });
}
