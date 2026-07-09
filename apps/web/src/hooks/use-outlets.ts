import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/src/lib/api";
import { toDisplayOutlet, type Outlet } from "@/src/lib/data/outlets";

export const OUTLETS_QUERY = {
  queryKey: ["outlets"] as const,
  queryFn: () => apiClient.listOutlets(),
  // Outlet status changes are pushed through OutletRealtimeBridge.
  // Keep this as a normal cache fetch, not a customer-wide polling loop.
  staleTime: 60_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
};

export const MENU_CATALOG_REFRESH_INTERVAL_MS = 30_000;

export function useOutlets() {
  return useQuery({
    ...OUTLETS_QUERY,
    select: (summaries): Outlet[] => summaries.map((s, i) => toDisplayOutlet(s, i)),
  });
}
