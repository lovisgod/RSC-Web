import { useQuery } from "@tanstack/react-query";
import { listMenuCategories, listMenuItems } from "../lib/api";

export function useMenuCategories(outletId: string) {
  return useQuery({
    queryKey: ["pos", "menu", "categories", outletId],
    queryFn: () => listMenuCategories(outletId),
    enabled: Boolean(outletId),
  });
}

export function useMenuItems(outletId: string, categoryId?: string) {
  return useQuery({
    queryKey: ["pos", "menu", "items", outletId, categoryId ?? "all"],
    queryFn: () => listMenuItems(outletId, categoryId),
    enabled: Boolean(outletId),
  });
}
