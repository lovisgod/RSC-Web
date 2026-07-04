import { useQuery } from "@tanstack/react-query";
import type { OperationsStatsQuery, OrderPulseRange } from "@rsc/contracts";

import { getOperationsQueue, getOperationsSummary, getOrderPulse } from "../lib/api";

const REFRESH_INTERVAL = 30_000;

export function useOperationsSummary(input: OperationsStatsQuery = {}) {
  return useQuery({
    queryKey: ["admin", "stats", "operations", "summary", input],
    queryFn: () => getOperationsSummary(input),
    refetchInterval: REFRESH_INTERVAL,
  });
}

export function useOrderPulse(range: OrderPulseRange, input: OperationsStatsQuery = {}) {
  return useQuery({
    queryKey: ["admin", "stats", "operations", "order-pulse", range, input],
    queryFn: () => getOrderPulse({ ...input, range }),
    refetchInterval: REFRESH_INTERVAL,
  });
}

export function useOperationsQueue(input: OperationsStatsQuery = {}) {
  return useQuery({
    queryKey: ["admin", "stats", "operations", "queue", input],
    queryFn: () => getOperationsQueue(input),
    refetchInterval: REFRESH_INTERVAL,
  });
}
