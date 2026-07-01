import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getOutletById, toggleOutletOnlineStatus } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

export function useOutletInfo(outletId: string) {
  return useQuery({
    queryKey: ["pos", "outlet", outletId],
    queryFn: () => getOutletById(outletId),
    enabled: Boolean(outletId),
    staleTime: 60_000,
  });
}

export function useToggleOutletOnline(outletId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (isOnline: boolean) => toggleOutletOnlineStatus(outletId, { isOnline }),
    onSuccess: (data) => {
      queryClient.setQueryData(["pos", "outlet", outletId], data);
      toastBus.emit(data.isOnline ? "Outlet is now Online" : "Outlet is now Offline", "info");
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });
}
