import { useQuery } from "@tanstack/react-query";

import { getOutletMenu, type OutletMenu } from "@/src/lib/data/outlet-menu";
import { OUTLETS } from "@/src/lib/data/outlets";

export function useAllMenu() {
  return useQuery<OutletMenu[]>({
    queryKey: ["all-menu"],
    queryFn: async () => {
      // TODO: replace with parallel apiClient.getOutletMenu(id) calls per outlet
      await new Promise((r) => setTimeout(r, 500));
      return OUTLETS.map((o) => getOutletMenu(o.id)).filter((m): m is OutletMenu => m !== null);
    },
    staleTime: 5 * 60 * 1000,
  });
}
