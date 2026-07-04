import { useQuery } from "@tanstack/react-query";

import { getProfile } from "../lib/api";

export function useProfile() {
  return useQuery({
    queryKey: ["outlet-admin", "profile"],
    queryFn: getProfile,
    staleTime: 5 * 60_000,
  });
}
