import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/src/lib/api";
import { toDisplayOutlet, type Outlet } from "@/src/lib/data/outlets";

export function useOutlets() {
  return useQuery<Outlet[]>({
    queryKey: ["outlets"],
    queryFn: async () => {
      const summaries = await apiClient.listOutlets();
      return summaries.map(toDisplayOutlet);
    },
    staleTime: 5 * 60 * 1000,
  });
}
