import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/src/lib/api";
import { isActiveOrder, isCompletedOrder, type Order } from "@/src/lib/data/orders";

const ORDERS_QUERY = {
  queryKey: ["orders"] as const,
  queryFn: () => apiClient.listCustomerOrders(),
};

export function useActiveOrders() {
  return useQuery({
    ...ORDERS_QUERY,
    select: (orders): Order[] =>
      orders
        .filter(isActiveOrder)
        .sort(
          (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        ),
  });
}

export function useCompletedOrders() {
  return useQuery({
    ...ORDERS_QUERY,
    select: (orders): Order[] => orders.filter(isCompletedOrder),
  });
}
