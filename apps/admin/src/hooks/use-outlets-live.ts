import { useQuery } from "@tanstack/react-query";

import { listOutlets } from "../lib/api";

export function useOutletsLive() {
  return useQuery({
    queryKey: ["admin", "outlets"],
    queryFn: async () => {
      const data = await listOutlets();
      console.log("[useOutletsLive] outlets response:", data);
      return data;
    },
    refetchInterval: 15_000,
  });
}
