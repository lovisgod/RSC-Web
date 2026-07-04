import { useQuery } from "@tanstack/react-query";

import { type OutletAdminUser, listOutletAdmins } from "../lib/api";

export function useOutletAdmins(outletId: string) {
  return useQuery<OutletAdminUser[]>({
    queryKey: ["admin", "outlet-admins", outletId],
    queryFn: () => listOutletAdmins(outletId),
    enabled: !!outletId,
  });
}
