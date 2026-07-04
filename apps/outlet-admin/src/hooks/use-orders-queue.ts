import { useQuery } from "@tanstack/react-query";
import { listAdminOrders } from "../lib/api";

export function useOrdersQueue(outletId: string) {
  return useQuery({
    queryKey: ["pos", "orders", outletId],
    queryFn: () => listAdminOrders(outletId),
    enabled: Boolean(outletId),
    refetchInterval: 15_000,
  });
}
