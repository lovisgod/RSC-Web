import { useQuery } from "@tanstack/react-query";
import { getMenuItemById } from "../lib/api";

export function useMenuItem(itemId: string | null) {
  return useQuery({
    queryKey: ["pos", "menu-item", itemId],
    queryFn: () => getMenuItemById(itemId!),
    enabled: Boolean(itemId),
  });
}
