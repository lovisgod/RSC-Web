import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getOutletById, toggleOutletOnlineStatus } from "../lib/api";
import { outletAdminKeys } from "../lib/query-keys";
import { toastBus } from "../lib/toast-bus";

export function useOutletInfo(outletId: string) {
  return useQuery({
    queryKey: outletAdminKeys.outlet.detail(outletId),
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
      queryClient.setQueryData(outletAdminKeys.outlet.detail(outletId), data);
      toastBus.emit(data.isOnline ? "Outlet is now Online" : "Outlet is now Offline", "info");
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });
}
