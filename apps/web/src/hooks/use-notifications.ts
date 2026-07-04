import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/src/lib/api";

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiClient.listNotifications(),
  });
}
