import { useQuery } from "@tanstack/react-query";
import { listItemModifierGroups } from "../lib/api";

export function useItemModifierGroups() {
  return useQuery({
    queryKey: ["pos", "modifier-groups"],
    queryFn: listItemModifierGroups,
    staleTime: 5 * 60_000,
  });
}
