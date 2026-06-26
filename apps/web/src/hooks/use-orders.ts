import { useQuery } from "@tanstack/react-query";

import { DUMMY_ACTIVE_ORDER, DUMMY_COMPLETED_ORDERS, type Order } from "@/src/lib/data/orders";

export function useActiveOrder() {
  return useQuery<Order | null>({
    queryKey: ["orders", "active"],
    queryFn: async () => {
      // TODO: replace with apiClient.getActiveOrder()
      await new Promise((r) => setTimeout(r, 400));
      return DUMMY_ACTIVE_ORDER;
    },
    staleTime: 30 * 1000,
  });
}

export function useCompletedOrders() {
  return useQuery<Order[]>({
    queryKey: ["orders", "completed"],
    queryFn: async () => {
      // TODO: replace with apiClient.getCompletedOrders()
      await new Promise((r) => setTimeout(r, 400));
      return DUMMY_COMPLETED_ORDERS;
    },
    staleTime: 60 * 1000,
  });
}
