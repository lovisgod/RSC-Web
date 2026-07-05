import type { UpdatePlatformChargesInput } from "@rsc/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getPlatformCharges, updatePlatformCharges } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

const PLATFORM_CHARGES_QUERY_KEY = ["admin", "platform-charges"] as const;

export function usePlatformCharges() {
  return useQuery({
    queryKey: PLATFORM_CHARGES_QUERY_KEY,
    queryFn: getPlatformCharges,
  });
}

export function useUpdatePlatformCharges() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdatePlatformChargesInput) => updatePlatformCharges(input),
    onSuccess: (charges) => {
      queryClient.setQueryData(PLATFORM_CHARGES_QUERY_KEY, charges);
      toastBus.emit("Platform charges updated", "success");
    },
    onError: (error: Error) => toastBus.emit(error.message, "error"),
  });
}
