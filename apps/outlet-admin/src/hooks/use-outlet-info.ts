import { useQuery } from "@tanstack/react-query";
import { getOutletById } from "../lib/api";
import { outletAdminKeys } from "../lib/query-keys";

export function useOutletInfo(outletId: string) {
  return useQuery({
    queryKey: outletAdminKeys.outlet.detail(outletId),
    queryFn: () => getOutletById(outletId),
    enabled: Boolean(outletId),
    staleTime: 60_000,
  });
}
