import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toggleOutletOnlineStatus } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

interface ToggleInput {
  outlet: { id: string; name: string };
  isOnline: boolean;
}

export function useToggleOutletStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ outlet, isOnline }: ToggleInput) =>
      toggleOutletOnlineStatus(outlet.id, { isOnline }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "outlets"] });
      toastBus.emit("Outlet status updated", "success");
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });
}
