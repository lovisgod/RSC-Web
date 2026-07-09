import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MasterOrderStatus, SubOrderStatus } from "@rsc/contracts";
import { updateSubOrderStatus, type PosSubOrder } from "../lib/api";
import { outletAdminKeys } from "../lib/query-keys";
import { toastBus } from "../lib/toast-bus";

// Server maps master status → sub-order status. Mirror it for optimistic updates.
const MASTER_TO_SUB: Partial<Record<MasterOrderStatus, SubOrderStatus>> = {
  CONFIRMED: "ACCEPTED",
  PARTIALLY_READY: "PREPARING",
  READY: "READY",
  DELIVERED: "COLLECTED",
};

const PREPARATION_TIME_NOTE_PREFIX = "Estimated preparation time:";

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
    }) =>
      updateSubOrderStatus(subOrderId, {
        status,
        ...(preparationTimeMinutes !== undefined
          ? { note: `${PREPARATION_TIME_NOTE_PREFIX} ${preparationTimeMinutes} minutes` }
          : {}),
      }),
    onMutate: async ({ subOrderId, status, preparationTimeMinutes }) => {
      const queryKey = outletAdminKeys.orders(outletId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<PosSubOrder[]>(queryKey);
      const subStatus = MASTER_TO_SUB[status];
      if (subStatus) {
        queryClient.setQueryData<PosSubOrder[]>(queryKey, (orders) =>
          orders?.map((o) =>
            o.id === subOrderId
              ? {
                  ...o,
                  status: subStatus,
                  ...(preparationTimeMinutes !== undefined
                    ? { estimatedPrepTimeMinutes: preparationTimeMinutes }
                    : {}),
                }
              : o,
          ),
        );
      }
      return { previous };
    },
    onSuccess: () => {
      toastBus.emit("Order updated", "success");
    },
    onError: (err: Error, _vars, ctx) => {
      queryClient.setQueryData(outletAdminKeys.orders(outletId), ctx?.previous);
      toastBus.emit(err.message, "error");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: outletAdminKeys.orders(outletId) });
    },
  });
}
