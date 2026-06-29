import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/src/lib/api";
import { buildOutletMenu, type OutletMenu } from "@/src/lib/data/outlet-menu";
import { useOutlets } from "@/src/hooks/use-outlets";

export function useOutletMenu(outletId: string) {
  const { data: outlets, isPending: outletsPending } = useOutlets();
  const outlet = outlets?.find((o) => o.id === outletId);

  const itemsQuery = useQuery({
    queryKey: ["menu-items", outletId],
    queryFn: () => apiClient.listMenuItems(outletId),
    enabled: !!outletId,
    staleTime: 5 * 60 * 1000,
  });

  const categoriesQuery = useQuery({
    queryKey: ["menu-categories", outletId],
    queryFn: () => apiClient.listMenuCategories(outletId),
    enabled: !!outletId,
    staleTime: 5 * 60 * 1000,
  });

  const data = useMemo<OutletMenu | undefined>(() => {
    if (!outlet || !itemsQuery.data || !categoriesQuery.data) return undefined;
    return buildOutletMenu(outlet, itemsQuery.data, categoriesQuery.data);
  }, [outlet, itemsQuery.data, categoriesQuery.data]);

  return {
    data,
    isPending: outletsPending || itemsQuery.isPending || categoriesQuery.isPending,
    isError: itemsQuery.isError || categoriesQuery.isError,
  };
}
