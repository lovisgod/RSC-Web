"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { formatNaira } from "@/src/lib/data/cart";
import { formatOutletRating } from "@/src/lib/data/outlets";
import type { MenuItem } from "@/src/lib/data/outlet-menu";
import { useOutletMenu } from "@/src/hooks/use-outlet-menu";
import { MenuItemCard } from "@/src/components/outlet-detail/menu-item-card";
import { ItemDetailModal } from "@/src/components/outlet-detail/item-detail-modal";
import { CategoryDropdown } from "./category-dropdown";
import { ArrowLeft, Star } from "lucide-react";

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

        {/* Category selector */}
        <div className="h-14 w-full sm:max-w-sm rounded-2xl bg-[var(--rsc-line)]" />
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
          onClick={() => router.push("/")}
          className="text-sm font-semibold hover:underline mt-1"
          style={{ color: "var(--rsc-brand)" }}
        >
          Back to home
        </button>
      </div>
    );
  }

  const currentCategory =
    menu.categories.find((category) => category.id === activeCategory) ?? menu.categories[0];
  const visibleItems = currentCategory
    ? menu.items.filter((item) => item.categoryId === currentCategory.id)
    : [];
  const isOffline = menu.isOnline === false;
  const activeSelectedItem = isOffline ? null : selectedItem;
  const rating = formatOutletRating(menu.rating);

  return (
    <>
      {/* Header */}
      <div
        className="relative h-52"
        style={{
          backgroundColor: menu.headerColor,
          ...(menu.image.startsWith("/") || menu.image.startsWith("http")
            ? {
                backgroundImage: `url(${menu.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {}),
        }}
      >
        {/* Darken overlay so the back button stays readable over photos */}
        {(menu.image.startsWith("/") || menu.image.startsWith("http")) && (
          <div className="absolute inset-0 bg-black/30" />
        )}

        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="Back to home"
          className="absolute top-3 left-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md border border-gray-200 text-gray-700 transition hover:bg-white hover:text-black dark:bg-gray-900/90 dark:border-gray-800 dark:text-gray-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Emoji fallback — only shown when no photo */}
        {!menu.image.startsWith("/") && !menu.image.startsWith("http") && (
          <span className="absolute inset-0 flex items-center justify-center text-8xl">
            {menu.image}
          </span>
        )}
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Outlet info */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{menu.outletName}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{menu.cuisines.join(" · ")}</p>
          {(rating || menu.deliveryTime || menu.deliveryFeeMinor !== undefined) && (
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span
                className="inline-flex items-center gap-1 font-semibold"
                style={{ color: "var(--rsc-brand)" }}
              >
                <Star className="h-5 w-5 fill-current" aria-hidden="true" />
                {rating}
              </span>
              {menu.deliveryTime && <span>⏱ {menu.deliveryTime}</span>}
              {menu.deliveryFeeMinor !== undefined && (
                <span>🚗 {formatNaira(menu.deliveryFeeMinor)} delivery</span>
              )}
            </div>
          )}
        </div>

        {isOffline && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            This outlet is currently offline. Ordering is paused until it comes back online.
          </div>
        )}

        {/* All is intentionally disabled: select one real category. */}
        <CategoryDropdown
          categories={menu.categories}
          selectedId={currentCategory?.id}
          onSelect={setActiveCategory}
        />
        {/* Category heading + items grid */}
        <div id="outlet-menu-items">
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            {currentCategory?.name ?? "Menu"}
          </h2>

          {visibleItems.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              {currentCategory
                ? "No items available in this category."
                : "No menu categories available yet."}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visibleItems.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onAdd={() => setSelectedItem(item)}
                  disabled={isOffline}
                  disabledLabel={isOffline ? "Offline" : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Item detail modal */}
      {activeSelectedItem && (
        <ItemDetailModal
          item={activeSelectedItem}
          outletName={menu.outletName}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  );
}
