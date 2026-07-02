import { useQuery } from "@tanstack/react-query";

import { toDisplayOutlet } from "@/src/lib/data/outlets";
import { buildOutletMenu, type OutletMenu } from "@/src/lib/data/outlet-menu";
import { OUTLETS_QUERY } from "@/src/hooks/use-outlets";

export function useAllMenu() {
  return useQuery({
    ...OUTLETS_QUERY,
    select: (summaries): OutletMenu[] =>
      summaries.map((s, i) => buildOutletMenu(toDisplayOutlet(s, i), s)),
  });
}
