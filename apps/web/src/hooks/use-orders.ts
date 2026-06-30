import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/src/lib/api";
import { isActiveOrder, isCompletedOrder, type Order } from "@/src/lib/data/orders";

const ORDERS_QUERY = {
  queryKey: ["orders"] as const,
  queryFn: () => apiClient.listOrders(),
  staleTime: 30 * 1000,
};

export function useActiveOrder() {
  return useQuery({
    ...ORDERS_QUERY,
    select: (orders): Order | null => orders.find(isActiveOrder) ?? null,
  });
}

export function useCompletedOrders() {
  return useQuery({
    ...ORDERS_QUERY,
    select: (orders): Order[] => orders.filter(isCompletedOrder),
  });
}
