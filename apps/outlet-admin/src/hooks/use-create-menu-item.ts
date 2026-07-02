import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMenuItem, type CreateMenuItemBody } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

export function useCreateMenuItem(outletId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateMenuItemBody) => createMenuItem(outletId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos", "menu", "items", outletId] });
      toastBus.emit("Menu item created", "success");
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });
}
