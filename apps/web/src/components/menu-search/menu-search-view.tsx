"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAllMenu } from "@/src/hooks/use-all-menu";
import type { MenuItem } from "@/src/lib/data/outlet-menu";
import { ItemDetailModal } from "@/src/components/outlet-detail/item-detail-modal";
import { MenuSearchItemCard } from "@/src/components/menu-search/menu-search-item-card";

function OutletSection({
  outletName,
  items,
  onViewOptions,
}: {
  outletName: string;
  items: MenuItem[];
  onViewOptions: (item: MenuItem) => void;
}) {
  return (
    <section className="space-y-3">
      <h2
        className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest"
        style={{ color: "var(--rsc-dark)" }}
      >
        <span>📍</span>
        <span>{outletName}</span>
      </h2>
      {items.map((item) => (
        <MenuSearchItemCard key={item.id} item={item} onViewOptions={() => onViewOptions(item)} />
      ))}
    </section>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[1, 2].map((o) => (
        <div key={o} className="space-y-3">
          <div className="h-4 w-28 bg-gray-200 rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function MenuSearchView() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const { data: menus, isPending } = useAllMenu();

  const q = query.trim().toLowerCase();

  const filtered = (menus ?? [])
    .map((menu) => ({
      outletName: menu.outletName,
      items: menu.items.filter(
        (item) =>
          !q || item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q),
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Top bar */}
        <div className="flex items-center gap-3 p-4 bg-white border-b border-gray-100 sticky top-0 z-10">
          {/* <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm text-gray-700 hover:bg-gray-50 transition-colors flex-shrink-0"
          >
            ←
          </button> */}

          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              placeholder="Search across all outlets..."
              className="w-full pl-9 pr-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:border-[var(--rsc-main)] focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {isPending ? (
            <Skeleton />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
              <p className="text-3xl">🍽️</p>
              <p className="font-semibold text-gray-700">No items found</p>
              {q && <p className="text-sm text-gray-400">Try a different search term.</p>}
            </div>
          ) : (
            filtered.map((section) => (
              <OutletSection
                key={section.outletName}
                outletName={section.outletName}
                items={section.items}
                onViewOptions={setSelectedItem}
              />
            ))
          )}
        </div>
      </div>

      {selectedItem && (
        <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </>
  );
}
