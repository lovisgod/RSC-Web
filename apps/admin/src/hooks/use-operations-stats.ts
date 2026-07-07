import { useQuery } from "@tanstack/react-query";
import type { OperationsStatsQuery, OrderPulseRange } from "@rsc/contracts";

import { getOperationsQueue, getOperationsSummary, getOrderPulse } from "../lib/api";

const FALLBACK_REFRESH_INTERVAL = 60_000;

export function useOperationsSummary(input: OperationsStatsQuery = {}) {
  return useQuery({
    queryKey: ["admin", "stats", "operations", "summary", input],
    queryFn: () => getOperationsSummary(input),
    refetchInterval: FALLBACK_REFRESH_INTERVAL,
    refetchIntervalInBackground: false,
  });
}

export function useOrderPulse(range: OrderPulseRange, input: OperationsStatsQuery = {}) {
  return useQuery({
    queryKey: ["admin", "stats", "operations", "order-pulse", range, input],
    queryFn: () => getOrderPulse({ ...input, range }),
    refetchInterval: FALLBACK_REFRESH_INTERVAL,
    refetchIntervalInBackground: false,
  });
}

export function useOperationsQueue(input: OperationsStatsQuery = {}) {
  return useQuery({
    queryKey: ["admin", "stats", "operations", "queue", input],
    queryFn: () => getOperationsQueue(input),
    refetchInterval: FALLBACK_REFRESH_INTERVAL,
    refetchIntervalInBackground: false,
  });
}
