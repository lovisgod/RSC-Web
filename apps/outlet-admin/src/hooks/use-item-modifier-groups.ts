import { useQuery } from "@tanstack/react-query";
import { listItemModifierGroups } from "../lib/api";
import { outletAdminKeys } from "../lib/query-keys";

export function useItemModifierGroups(outletId: string) {
  return useQuery({
    queryKey: outletAdminKeys.modifierGroups(outletId),
    queryFn: () => listItemModifierGroups(outletId),
    select: (groups) => groups.filter((group) => group.outletId === outletId),
    enabled: Boolean(outletId),
    staleTime: 5 * 60_000,
  });
}
