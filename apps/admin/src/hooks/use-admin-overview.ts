import { useQuery } from "@tanstack/react-query";

import { apiClient } from "../lib/api";

export function useAdminOverview() {
  return useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => apiClient.getAdminOverview(),
    refetchInterval: 30_000,
  });
}
