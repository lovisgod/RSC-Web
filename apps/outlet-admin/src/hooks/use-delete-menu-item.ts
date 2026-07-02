import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteMenuItem } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

export function useDeleteMenuItem(outletId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => deleteMenuItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos", "outlet", outletId] });
      toastBus.emit("Menu item deleted", "success");
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });
}
