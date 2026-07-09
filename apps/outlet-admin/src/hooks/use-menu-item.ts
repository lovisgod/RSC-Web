import { useQuery } from "@tanstack/react-query";
import { getMenuItemById } from "../lib/api";
import { outletAdminKeys } from "../lib/query-keys";

export function useMenuItem(itemId: string | null) {
  return useQuery({
    queryKey: outletAdminKeys.menuItem.detail(itemId),
    queryFn: () => getMenuItemById(itemId!),
    enabled: Boolean(itemId),
  });
}
