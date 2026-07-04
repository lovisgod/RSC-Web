"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { apiClient } from "@/src/lib/api";

const LIMIT = 2;

export function useMenuSearch(q: string) {
  return useInfiniteQuery({
    queryKey: ["menu-items-search", q] as const,
    queryFn: ({ pageParam }) => {
      const params: { q?: string; limit: number; offset: number } = {
        limit: LIMIT,
        offset: pageParam,
      };
      if (q) params.q = q;
      return apiClient.searchMenuItems(params);
    },
    getNextPageParam: (last) => (last.hasMore ? last.offset + last.limit : undefined),
    initialPageParam: 0,
  });
}
