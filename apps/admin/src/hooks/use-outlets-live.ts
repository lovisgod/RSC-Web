import { useQuery } from "@tanstack/react-query";

import { apiClient } from "../lib/api";

export function useOutletsLive() {
  return useQuery({
    queryKey: ["admin", "outlets"],
    queryFn: () => apiClient.listOutlets(),
    refetchInterval: 15_000,
  });
}
