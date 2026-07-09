import { useQuery } from "@tanstack/react-query";

import { listOutlets } from "../lib/api";

export function useOutletsLive() {
  return useQuery({
    queryKey: ["admin", "outlets"],
    queryFn: () => listOutlets(),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}
