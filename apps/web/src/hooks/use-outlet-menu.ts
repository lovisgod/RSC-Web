import { useQuery } from "@tanstack/react-query";

import { toDisplayOutlet } from "@/src/lib/data/outlets";
import { buildOutletMenu, type OutletMenu } from "@/src/lib/data/outlet-menu";
import { MENU_CATALOG_REFRESH_INTERVAL_MS, OUTLETS_QUERY } from "@/src/hooks/use-outlets";

export function useOutletMenu(outletId: string) {
  return useQuery({
    ...OUTLETS_QUERY,
    // Menu item availability does not have a realtime event yet.
    // Refresh only while customers are actively viewing a menu.
    refetchInterval: MENU_CATALOG_REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    select: (summaries): OutletMenu | undefined => {
      const idx = summaries.findIndex((s) => s.id === outletId);
      if (idx === -1) return undefined;
      const summary = summaries[idx]!;
      return buildOutletMenu(toDisplayOutlet(summary, idx), summary);
    },
  });
}
