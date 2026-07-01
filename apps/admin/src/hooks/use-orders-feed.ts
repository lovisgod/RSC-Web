import { useQuery } from "@tanstack/react-query";
import type { OrderSummary } from "@rsc/contracts";

import { listOrders } from "../lib/api";

export function useOrdersFeed(query: string) {
  return useQuery<OrderSummary[]>({
    queryKey: ["admin", "orders", { query }],
    queryFn: () => listOrders(query || undefined),
    staleTime: 0,
    refetchInterval: 10_000,
  });
}
