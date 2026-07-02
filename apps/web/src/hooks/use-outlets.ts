import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/src/lib/api";
import { toDisplayOutlet, type Outlet } from "@/src/lib/data/outlets";

export const OUTLETS_QUERY = {
  queryKey: ["outlets"] as const,
  queryFn: () => apiClient.listOutlets(),
  staleTime: 5 * 60 * 1000,
};

export function useOutlets() {
  return useQuery({
    ...OUTLETS_QUERY,
    select: (summaries): Outlet[] => summaries.map((s, i) => toDisplayOutlet(s, i)),
  });
}
