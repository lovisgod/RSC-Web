import { useQuery } from "@tanstack/react-query";
import { getOutletById } from "../lib/api";

export function useMenuCategories(outletId: string) {
  return useQuery({
    queryKey: ["pos", "outlet", outletId],
    queryFn: () => getOutletById(outletId),
    enabled: Boolean(outletId),
    staleTime: 60_000,
    select: (outlet) => outlet.menuCategories,
  });
}

export function useMenuItems(outletId: string, categoryId?: string) {
  return useQuery({
    queryKey: ["pos", "outlet", outletId],
    queryFn: () => getOutletById(outletId),
    enabled: Boolean(outletId),
    staleTime: 60_000,
    select: (outlet) =>
      categoryId
        ? outlet.menuItems.filter((item) => item.categoryId === categoryId)
        : outlet.menuItems,
  });
}
