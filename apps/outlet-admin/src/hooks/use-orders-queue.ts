import { useQuery } from "@tanstack/react-query";
import { listSubOrders } from "../lib/api";

export function useOrdersQueue(outletId: string) {
  return useQuery({
    queryKey: ["pos", "orders", outletId],
    queryFn: () => listSubOrders(outletId),
    enabled: Boolean(outletId),
    refetchInterval: 15_000,
  });
}
