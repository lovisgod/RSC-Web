"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

import { useMenuSearch } from "@/src/hooks/use-menu-search";
import { OUTLETS_QUERY, useOutlets } from "@/src/hooks/use-outlets";
import { buildOutletMenu, type MenuItem } from "@/src/lib/data/outlet-menu";
import { toDisplayOutlet } from "@/src/lib/data/outlets";
import { ItemDetailModal } from "@/src/components/outlet-detail/item-detail-modal";
import { MenuSearchItemCard } from "@/src/components/menu-search/menu-search-item-card";
import type { OutletSummary } from "@rsc/contracts";

const DEBOUNCE_MS = 500;

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-start gap-3 p-3 animate-pulse">
      <div className="w-20 h-20 flex-shrink-0 rounded-xl bg-gray-100" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3 w-20 bg-gray-100 rounded-full" />
        <div className="h-4 w-40 bg-gray-200 rounded-full" />
        <div className="h-3 w-32 bg-gray-100 rounded-full" />
        <div className="h-3 w-16 bg-gray-200 rounded-full mt-2" />
      </div>
    </div>
  );
}

type SelectedItem = { item: MenuItem; outletName: string };

function resolveItemFromSummaries(
  summaries: OutletSummary[],
  outletId: string,
  itemId: string,
): MenuItem | null {
  const idx = summaries.findIndex((s) => s.id === outletId);
  if (idx === -1) return null;
  const summary = summaries[idx]!;
  const menu = buildOutletMenu(toDisplayOutlet(summary, idx), summary);
  return menu.items.find((i) => i.id === itemId) ?? null;
}

export function MenuSearchView() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [activeOutletId, setActiveOutletId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qc = useQueryClient();

  function handleInput(value: string) {
    setInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim() === "") {
      setQuery("");
      return;
    }

    debounceRef.current = setTimeout(() => setQuery(value.trim()), DEBOUNCE_MS);
  }

  const { data: outlets = [], isPending: outletsPending } = useOutlets();
  const { data, isPending, isFetchingNextPage, hasNextPage, fetchNextPage } = useMenuSearch(
    query,
    activeOutletId,
  );

  const allItems = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const total = data?.pages[0]?.total ?? null;
  const activeOutletName = outlets.find((outlet) => outlet.id === activeOutletId)?.name ?? null;

  // outletId → name from outlets cache (best-effort; falls back to "Kitchen")
  const outletNameMap = useMemo(() => {
    return new Map(outlets.map((outlet) => [outlet.id, outlet.name]));
  }, [outlets]);

  // When "View options" is clicked:
  //  - If outlets cache is warm → resolve modifier groups instantly and open modal
  //  - If cold → ensure the cache is populated (single fetch) then open modal
  async function handleViewOptions(outletId: string, itemId: string, outletName: string) {
    setLoadingItemId(itemId);
    try {
      const summaries = await qc.ensureQueryData(OUTLETS_QUERY);
      const full = resolveItemFromSummaries(summaries, outletId, itemId);
      if (full) setSelected({ item: full, outletName });
    } finally {
      setLoadingItemId(null);
    }
  }

  // Intersection observer → infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(handleObserver, { rootMargin: "120px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [handleObserver]);

  const showEmpty = !isPending && allItems.length === 0;

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Search bar */}
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3 p-4">
            <Link
              href="/outlets"
              aria-label="Back to home"
              title="Back to home"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gray-200 bg-white text-gray-600 transition-colors hover:border-[var(--rsc-main)] hover:text-[var(--rsc-main)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rsc-brand)]"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                autoFocus
                value={input}
                onChange={(e) => handleInput(e.target.value)}
                type="search"
                placeholder={`Search ${activeOutletName ?? "all outlets"}…`}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-9 pr-4 text-sm transition-colors focus:border-[var(--rsc-main)] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div
            className="-mt-1 flex gap-2 overflow-x-auto px-4 pb-3"
            aria-label="Filter menu search by outlet"
          >
            <button
              type="button"
              onClick={() => setActiveOutletId(null)}
              aria-pressed={activeOutletId === null}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                activeOutletId === null
                  ? "border-[var(--rsc-main)] bg-[var(--rsc-main)] text-white"
                  : "border-gray-200 bg-white text-gray-500 hover:border-[var(--rsc-main)] hover:text-[var(--rsc-main)]"
              }`}
            >
              All
            </button>
            {outlets.map((outlet) => {
              const isActive = activeOutletId === outlet.id;
              return (
                <button
                  key={outlet.id}
                  type="button"
                  onClick={() => setActiveOutletId(outlet.id)}
                  aria-pressed={isActive}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? "border-[var(--rsc-main)] bg-[var(--rsc-main)] text-white"
                      : "border-gray-200 bg-white text-gray-500 hover:border-[var(--rsc-main)] hover:text-[var(--rsc-main)]"
                  }`}
                >
                  {outlet.name}
                </button>
              );
            })}
            {outletsPending && (
              <>
                <span className="h-10 w-24 shrink-0 animate-pulse rounded-full bg-gray-100" />
                <span className="h-10 w-28 shrink-0 animate-pulse rounded-full bg-gray-100" />
              </>
            )}
          </div>
        </div>

        {/* Result count */}
        {total !== null && !isPending && (
          <p className="px-4 pt-3 text-xs text-gray-400">
            {total === 0
              ? "No results"
              : `${total} item${total === 1 ? "" : "s"}${
                  query ? ` for "${query}"` : ""
                }${activeOutletName ? ` from ${activeOutletName}` : ""}`}
          </p>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isPending ? (
            Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          ) : showEmpty ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
              <p className="text-3xl">🍽️</p>
              <p className="font-semibold text-gray-700">No items found</p>
              {query && <p className="text-sm text-gray-400">Try a different search term.</p>}
            </div>
          ) : (
            <>
              {allItems.map((raw) => {
                const outletName = outletNameMap.get(raw.outletId) ?? "Kitchen";
                return (
                  <MenuSearchItemCard
                    key={raw.id}
                    item={raw}
                    outletName={outletName}
                    loading={loadingItemId === raw.id}
                    onViewOptions={() => void handleViewOptions(raw.outletId, raw.id, outletName)}
                  />
                );
              })}

              {isFetchingNextPage && (
                <>
                  <CardSkeleton />
                  <CardSkeleton />
                </>
              )}

              <div ref={sentinelRef} className="h-1" />

              {!hasNextPage && allItems.length > 0 && (
                <p className="text-center text-xs text-gray-300 py-4">
                  You&apos;ve seen everything
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {selected && (
        <ItemDetailModal
          item={selected.item}
          outletName={selected.outletName}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
