"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { formatNaira } from "@/src/lib/data/cart";
import type { MenuItem } from "@/src/lib/data/outlet-menu";
import { useOutletMenu } from "@/src/hooks/use-outlet-menu";
import { MenuItemCard } from "@/src/components/outlet-detail/menu-item-card";
import { ItemDetailModal } from "@/src/components/outlet-detail/item-detail-modal";
import { ArrowLeft } from "lucide-react";

function Skeleton() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="h-52 bg-gray-200" />

      <div className="p-4 sm:p-6 space-y-4">
        {/* Info */}
        <div className="space-y-2">
          <div className="h-7 w-40 bg-gray-200 rounded" />
          <div className="h-4 w-56 bg-gray-100 rounded" />
          <div className="h-4 w-48 bg-gray-100 rounded" />
        </div>

        {/* Tabs */}
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-20 bg-gray-200 rounded-full flex-shrink-0" />
          ))}
        </div>

        {/* Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function OutletDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { data: menu, isPending, isError } = useOutletMenu(id);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  if (isPending) return <Skeleton />;

  if (isError || !menu) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2 text-center px-4">
        <p className="text-3xl">🍽️</p>
        <p className="font-semibold text-gray-700">Kitchen not found</p>
        <button
          type="button"
          onClick={() => router.push("/outlets")}
          className="text-sm font-semibold hover:underline mt-1"
          style={{ color: "var(--rsc-dark)" }}
        >
          Back to kitchens
        </button>
      </div>
    );
  }

  const currentCategory = activeCategory ?? menu.categories[0]?.id ?? "";
  const visibleItems = menu.items.filter((item) => item.categoryId === currentCategory);

  return (
    <>
      {/* Header */}
      <div
        className="relative h-52 flex items-center justify-center text-8xl"
        style={{ backgroundColor: menu.headerColor }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft />
        </button>
        {menu.image.startsWith("/") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={menu.image} alt={menu.outletName} className="w-20 h-20 object-contain" />
        ) : (
          <span>{menu.image}</span>
        )}
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Outlet info */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{menu.outletName}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{menu.cuisines.join(" · ")}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span className="font-semibold" style={{ color: "var(--rsc-dark)" }}>
              ★ {menu.rating}
            </span>
            <span>⏱ {menu.deliveryTime}</span>
            <span>🚗 {formatNaira(menu.deliveryFeeMinor)} delivery</span>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 border-b border-gray-100 -mx-4 px-4 sm:mx-0 sm:px-0">
          {menu.categories.map((cat) => {
            const active = cat.id === currentCategory;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 pb-2 px-1 text-sm font-semibold transition-colors border-b-2 ${
                  active ? "border-[var(--rsc-dark)]" : "border-transparent text-gray-400"
                }`}
                style={active ? { color: "var(--rsc-dark)" } : {}}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Category heading + items grid */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            {menu.categories.find((c) => c.id === currentCategory)?.name}
          </h2>

          {visibleItems.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              No items available in this category.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visibleItems.map((item) => (
                <MenuItemCard key={item.id} item={item} onAdd={() => setSelectedItem(item)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Item detail modal */}
      {selectedItem && (
        <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </>
  );
}
