import { useQuery } from "@tanstack/react-query";

import { getAdminOverview } from "../lib/api";

export function useAdminOverview() {
  return useQuery({
    queryKey: ["admin", "overview"],
    queryFn: getAdminOverview,
    refetchInterval: 30_000,
  });
}
