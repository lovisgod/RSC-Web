import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/src/lib/api";
import {
  isActiveOrder,
  isCancelledOrder,
  isCompletedOrder,
  isProfileActiveOrder,
  type Order,
} from "@/src/lib/data/orders";
import { useAuthStore } from "@/src/stores/auth-store";

function sortNewestFirst(orders: Order[]): Order[] {
  return [...orders].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export function useActiveOrders() {
  const userId = useAuthStore((state) => state.userId);

  return useQuery({
    queryKey: ["orders", userId] as const,
    queryFn: () => apiClient.listCustomerOrders(),
    enabled: Boolean(userId),
    select: (result): Order[] => sortNewestFirst(result.orders.filter(isActiveOrder)),
  });
}

export function useProfileActiveOrders() {
  const userId = useAuthStore((state) => state.userId);

  return useQuery({
    queryKey: ["orders", userId] as const,
    queryFn: () => apiClient.listCustomerOrders(),
    enabled: Boolean(userId),
    select: (result): Order[] => sortNewestFirst(result.orders.filter(isProfileActiveOrder)),
  });
}

export function useCompletedOrders() {
  const userId = useAuthStore((state) => state.userId);

  return useQuery({
    queryKey: ["orders", userId] as const,
    queryFn: () => apiClient.listCustomerOrders(),
    enabled: Boolean(userId),
    select: (result): Order[] => sortNewestFirst(result.orders.filter(isCompletedOrder)),
  });
}

export function useCancelledOrders() {
  const userId = useAuthStore((state) => state.userId);

  return useQuery({
    queryKey: ["orders", userId] as const,
    queryFn: () => apiClient.listCustomerOrders(),
    enabled: Boolean(userId),
    select: (result): Order[] => sortNewestFirst(result.orders.filter(isCancelledOrder)),
  });
}
