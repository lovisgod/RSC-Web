import { useQuery } from "@tanstack/react-query";
import { listAdminOrders } from "../lib/api";
import { outletAdminKeys } from "../lib/query-keys";

export function useOrdersQueue(outletId: string) {
  return useQuery({
    queryKey: outletAdminKeys.orders(outletId),
    queryFn: () => listAdminOrders(outletId),
    enabled: Boolean(outletId),
    refetchInterval: 15_000,
  });
}
