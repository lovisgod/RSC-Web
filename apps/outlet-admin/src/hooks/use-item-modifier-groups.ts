import { useQuery } from "@tanstack/react-query";
import { listItemModifierGroups } from "../lib/api";

export function useItemModifierGroups(outletId: string) {
  return useQuery({
    queryKey: ["pos", "modifier-groups", outletId],
    queryFn: () => listItemModifierGroups(outletId),
    select: (groups) => groups.filter((group) => group.outletId === outletId),
    enabled: Boolean(outletId),
    staleTime: 5 * 60_000,
  });
}
