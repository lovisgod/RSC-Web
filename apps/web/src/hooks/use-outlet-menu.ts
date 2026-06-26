import { useQuery } from "@tanstack/react-query";

import { getOutletMenu, type OutletMenu } from "@/src/lib/data/outlet-menu";

export function useOutletMenu(id: string) {
  return useQuery<OutletMenu | null>({
    queryKey: ["outlet-menu", id],
    queryFn: async () => {
      // TODO: replace with apiClient.getOutletMenu(id)
      await new Promise((r) => setTimeout(r, 600));
      return getOutletMenu(id);
    },
    staleTime: 5 * 60 * 1000,
  });
}
