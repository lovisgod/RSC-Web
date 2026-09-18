import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/src/lib/api";
import { toDisplayOutlet, type Outlet } from "@/src/lib/data/outlets";
import { useCartStore } from "@/src/stores/cart-store";

export const OUTLETS_QUERY = {
  queryKey: ["outlets"] as const,
  queryFn: () => apiClient.listOutlets(),
  // Outlet status and menu item availability changes are pushed through OutletRealtimeBridge.
  // Keep this as a normal cache fetch, not a customer-wide polling loop.
  staleTime: 60_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
};

export function useOutlets() {
  const query = useQuery({
    ...OUTLETS_QUERY,
    select: (summaries): Outlet[] => summaries.map((s, i) => toDisplayOutlet(s, i)),
  });

  const reconcileItemPrices = useCartStore((s) => s.reconcileItemPrices);

  useEffect(() => {
    if (query.data && query.data.length > 0) {
      reconcileItemPrices(query.data);
    }
  }, [query.data, reconcileItemPrices]);

  return query;
}
