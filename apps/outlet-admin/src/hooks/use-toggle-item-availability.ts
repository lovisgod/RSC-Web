import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toggleMenuItemAvailability } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

export function useToggleItemAvailability(outletId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, isAvailable }: { itemId: string; isAvailable: boolean }) =>
      toggleMenuItemAvailability(outletId, itemId, { isAvailable }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos", "menu", "items", outletId] });
      toastBus.emit("Item availability updated", "success");
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });
}
