import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/src/lib/api";
import { isActiveOrder, isCompletedOrder, type Order } from "@/src/lib/data/orders";

const ORDERS_QUERY = {
  queryKey: ["orders"] as const,
  queryFn: () => apiClient.listCustomerOrders(),
  staleTime: 30 * 1000,
};

export function useActiveOrders() {
  return useQuery({
    ...ORDERS_QUERY,
    select: (orders): Order[] => orders.filter(isActiveOrder),
  });
}

export function useCompletedOrders() {
  return useQuery({
    ...ORDERS_QUERY,
    select: (orders): Order[] => orders.filter(isCompletedOrder),
  });
}
