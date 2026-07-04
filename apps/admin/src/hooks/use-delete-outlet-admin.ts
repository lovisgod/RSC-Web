import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteOutletAdmin } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

export function useDeleteOutletAdmin(outletId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteOutletAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "outlet-admins", outletId] });
      toastBus.emit("Staff member removed successfully", "success");
    },
    onError: (err) => toastBus.emit(err.message, "error"),
  });
}
