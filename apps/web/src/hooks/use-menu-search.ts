"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { apiClient } from "@/src/lib/api";

const DEFAULT_LIMIT = 2;

export function useMenuSearch(
  q: string,
  outletId: string | null = null,
  options: { enabled?: boolean; limit?: number } = {},
) {
  const limit = options.limit ?? DEFAULT_LIMIT;

  return useInfiniteQuery({
    queryKey: ["menu-items-search", q, outletId, limit] as const,
    queryFn: ({ pageParam }) => {
      const params: { q?: string; outletId?: string; limit: number; offset: number } = {
        limit,
        offset: pageParam,
      };
      if (q) params.q = q;
      if (outletId) params.outletId = outletId;
      return apiClient.searchMenuItems(params);
    },
    getNextPageParam: (last) => (last.hasMore ? last.offset + last.limit : undefined),
    initialPageParam: 0,
    enabled: options.enabled ?? true,
  });
}
