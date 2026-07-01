import { useQuery } from "@tanstack/react-query";

import { toDisplayOutlet } from "@/src/lib/data/outlets";
import { buildOutletMenu, type OutletMenu } from "@/src/lib/data/outlet-menu";
import { OUTLETS_QUERY } from "@/src/hooks/use-outlets";

export function useOutletMenu(outletId: string) {
  return useQuery({
    ...OUTLETS_QUERY,
    select: (summaries): OutletMenu | undefined => {
      const idx = summaries.findIndex((s) => s.id === outletId);
      if (idx === -1) return undefined;
      const summary = summaries[idx]!;
      return buildOutletMenu(toDisplayOutlet(summary, idx), summary);
    },
  });
}
