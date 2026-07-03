import { useQuery } from "@tanstack/react-query";

import { type AdminOrdersQuery, type AdminOrdersResult, listAdminOrders } from "../lib/api";

export function useOrdersFeed(params?: AdminOrdersQuery) {
  return useQuery<AdminOrdersResult>({
    queryKey: ["admin", "orders", params ?? {}],
    queryFn: () => listAdminOrders(params),
    staleTime: 0,
    refetchInterval: 10_000,
  });
}
