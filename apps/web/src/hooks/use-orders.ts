import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/src/lib/api";
import {
  isActiveOrder,
  isCompletedOrder,
  isProfileActiveOrder,
  type Order,
} from "@/src/lib/data/orders";
import { useAuthStore } from "@/src/stores/auth-store";

export function useActiveOrders() {
  const userId = useAuthStore((state) => state.userId);

  return useQuery({
    queryKey: ["orders", userId] as const,
    queryFn: () => apiClient.listCustomerOrders(),
    enabled: Boolean(userId),
    select: (orders): Order[] =>
      orders
        .filter(isActiveOrder)
        .sort(
          (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        ),
  });
}

export function useProfileActiveOrders() {
  const userId = useAuthStore((state) => state.userId);

  return useQuery({
    queryKey: ["orders", userId] as const,
    queryFn: () => apiClient.listCustomerOrders(),
    enabled: Boolean(userId),
    select: (orders): Order[] =>
      orders
        .filter(isProfileActiveOrder)
        .sort(
          (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        ),
  });
}

export function useCompletedOrders() {
  const userId = useAuthStore((state) => state.userId);

  return useQuery({
    queryKey: ["orders", userId] as const,
    queryFn: () => apiClient.listCustomerOrders(),
    enabled: Boolean(userId),
    select: (orders): Order[] => orders.filter(isCompletedOrder),
  });
}
