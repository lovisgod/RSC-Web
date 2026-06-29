import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/src/lib/api";
import { buildOutletMenu, type OutletMenu } from "@/src/lib/data/outlet-menu";
import { useOutlets } from "@/src/hooks/use-outlets";

export function useAllMenu() {
  const { data: outlets } = useOutlets();
  const outletKey = outlets?.map((o) => o.id).join(",") ?? "";

  return useQuery<OutletMenu[]>({
    queryKey: ["all-menu", outletKey],
    queryFn: async () => {
      if (!outlets?.length) return [];
      const results = await Promise.all(
        outlets.map(async (outlet) => {
          const [items, categories] = await Promise.all([
            apiClient.listMenuItems(outlet.id),
            apiClient.listMenuCategories(outlet.id),
          ]);
          return buildOutletMenu(outlet, items, categories);
        }),
      );
      return results;
    },
    enabled: !!outlets?.length,
    staleTime: 5 * 60 * 1000,
  });
}
