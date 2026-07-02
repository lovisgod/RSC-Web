import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MasterOrderStatus, SubOrderStatus } from "@rsc/contracts";
import { updateSubOrderStatus, type PosSubOrder } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

// Server maps master status → sub-order status. Mirror it for optimistic updates.
const MASTER_TO_SUB: Partial<Record<MasterOrderStatus, SubOrderStatus>> = {
  CONFIRMED: "ACCEPTED",
  PARTIALLY_READY: "PREPARING",
  READY: "READY",
  DELIVERED: "COLLECTED",
};

export function useUpdateOrderStatus(outletId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      subOrderId,
      status,
      preparationTimeMinutes,
    }: {
      subOrderId: string;
      status: MasterOrderStatus;
      preparationTimeMinutes?: number;
    }) => updateSubOrderStatus(subOrderId, { status, preparationTimeMinutes }),
    onMutate: async ({ subOrderId, status }) => {
      const queryKey = ["pos", "orders", outletId] as const;
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<PosSubOrder[]>(queryKey);
      const subStatus = MASTER_TO_SUB[status];
      if (subStatus) {
        queryClient.setQueryData<PosSubOrder[]>(queryKey, (orders) =>
          orders?.map((o) => (o.id === subOrderId ? { ...o, status: subStatus } : o)),
        );
      }
      return { previous };
    },
    onSuccess: () => {
      toastBus.emit("Order updated", "success");
    },
    onError: (err: Error, _vars, ctx) => {
      queryClient.setQueryData(["pos", "orders", outletId], ctx?.previous);
      toastBus.emit(err.message, "error");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["pos", "orders", outletId] });
    },
  });
}
