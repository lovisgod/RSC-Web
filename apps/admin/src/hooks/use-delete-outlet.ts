import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteOutlet } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

export function useDeleteOutlet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteOutlet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "outlets"] });
      toastBus.emit("Outlet removed", "success");
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });
}
