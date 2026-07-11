import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RiderAdmin } from "@rsc/contracts";

import { deleteRider, listRiders } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

export function useRiders(outletId?: string) {
  return useQuery<RiderAdmin[], Error>({
    queryKey: ["riders", outletId ?? "all"],
    queryFn: () => listRiders(outletId),
  });
}

export function useDeleteRider() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteRider,
    onSuccess: () => {
      toastBus.emit("Rider deleted successfully", "success");
      void queryClient.invalidateQueries({ queryKey: ["riders"] });
    },
    onError: (err) => {
      toastBus.emit(err.message, "error");
    },
  });
}
