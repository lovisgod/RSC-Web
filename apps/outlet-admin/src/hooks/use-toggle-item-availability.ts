import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toggleMenuItemAvailability } from "../lib/api";
import { outletAdminKeys } from "../lib/query-keys";
import { toastBus } from "../lib/toast-bus";

export function useToggleItemAvailability(outletId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, isAvailable }: { itemId: string; isAvailable: boolean }) =>
      toggleMenuItemAvailability(itemId, { isAvailable }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outletAdminKeys.outlet.root(outletId) });
      toastBus.emit("Item availability updated", "success");
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });
}
