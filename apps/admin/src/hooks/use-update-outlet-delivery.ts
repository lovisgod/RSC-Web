import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateOutlet, type OutletBody } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

export function useUpdateOutletDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<OutletBody> }) => updateOutlet(id, body),
    onSuccess: (outlet) => {
      queryClient.setQueryData(["admin", "outlets", outlet.id], outlet);
      void queryClient.invalidateQueries({ queryKey: ["admin", "outlets"] });
      void queryClient.invalidateQueries({ queryKey: ["outlets"] });
      toastBus.emit(`Delivery settings updated for ${outlet.name}`, "success");
    },
    onError: (error: Error) => toastBus.emit(error.message, "error"),
  });
}

export function useUpdateAllOutletsDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ outletIds, body }: { outletIds: string[]; body: Partial<OutletBody> }) => {
      return Promise.all(outletIds.map((id) => updateOutlet(id, body)));
    },
    onSuccess: (updatedList) => {
      for (const outlet of updatedList) {
        queryClient.setQueryData(["admin", "outlets", outlet.id], outlet);
      }
      void queryClient.invalidateQueries({ queryKey: ["admin", "outlets"] });
      void queryClient.invalidateQueries({ queryKey: ["outlets"] });
      toastBus.emit(`Delivery settings updated for all ${updatedList.length} outlets`, "success");
    },
    onError: (error: Error) => toastBus.emit(error.message, "error"),
  });
}
