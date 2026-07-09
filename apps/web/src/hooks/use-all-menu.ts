import { useQuery } from "@tanstack/react-query";

import { toDisplayOutlet } from "@/src/lib/data/outlets";
import { buildOutletMenu, type OutletMenu } from "@/src/lib/data/outlet-menu";
import { MENU_CATALOG_REFRESH_INTERVAL_MS, OUTLETS_QUERY } from "@/src/hooks/use-outlets";

export function useAllMenu() {
  return useQuery({
    ...OUTLETS_QUERY,
    // Menu item availability does not have a realtime event yet.
    // Refresh only while customers are actively viewing menu data.
    refetchInterval: MENU_CATALOG_REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    select: (summaries): OutletMenu[] =>
      summaries.map((s, i) => buildOutletMenu(toDisplayOutlet(s, i), s)),
  });
}
