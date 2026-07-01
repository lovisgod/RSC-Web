import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SubOrderStatus } from "@rsc/contracts";
import { updateSubOrderStatus } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

export function useUpdateOrderStatus(outletId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subOrderId, status }: { subOrderId: string; status: SubOrderStatus }) =>
      updateSubOrderStatus(outletId, subOrderId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos", "orders", outletId] });
      toastBus.emit("Order status updated", "success");
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });
}
