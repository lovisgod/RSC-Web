import { useQuery } from "@tanstack/react-query";
import type { OutletSummary } from "@rsc/contracts";

import { getOutlet } from "../lib/api";

export function useOutlet(id: string) {
  return useQuery<OutletSummary>({
    queryKey: ["admin", "outlets", id],
    queryFn: () => getOutlet(id),
    enabled: !!id,
  });
}
