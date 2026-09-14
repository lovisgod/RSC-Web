"use client";

import Link from "next/link";
import { Heart, Plus, ShoppingBag, Store, Utensils } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { OUTLETS_QUERY } from "@/src/hooks/use-outlets";
import { toDisplayOutlet } from "@/src/lib/data/outlets";
import { OutletCard } from "@/src/components/outlets/outlet-card";
import { useFavoritesStore } from "@/src/stores/favorites-store";
import { useCartStore } from "@/src/stores/cart-store";
import { formatNaira } from "@/src/lib/data/cart";
import type { MenuItemSummary } from "@rsc/contracts";

export function FavoritesView() {
  const { data: rawSummaries = [], isPending } = useQuery(OUTLETS_QUERY);
  const favoriteOutletIds = useFavoritesStore((s) => s.outletIds);
  const favoriteItemIds = useFavoritesStore((s) => s.itemIds);
  const toggleItem = useFavoritesStore((s) => s.toggleItem);
  const addItemToCart = useCartStore((s) => s.addItem);
  const [activeTab, setActiveTab] = useState<"kitchens" | "dishes">("kitchens");
  const [addedToast, setAddedToast] = useState<string | null>(null);

  const outlets = useMemo(() => rawSummaries.map((s, i) => toDisplayOutlet(s, i)), [rawSummaries]);

  const favoriteOutlets = useMemo(() => {
    return outlets.filter((outlet) => favoriteOutletIds.includes(outlet.id));
  }, [outlets, favoriteOutletIds]);

  const favoriteItems = useMemo(() => {
    const list: Array<MenuItemSummary & { outletName: string }> = [];
    for (const outlet of rawSummaries) {
      for (const item of outlet.menuItems ?? []) {
        if (favoriteItemIds.includes(item.id)) {
          list.push({ ...item, outletName: outlet.name });
        }
      }
    }
    return list;
  }, [rawSummaries, favoriteItemIds]);

  function handleQuickAdd(item: MenuItemSummary & { outletName: string }) {
    addItemToCart({
      outletId: item.outletId,
      outletName: item.outletName,
      item: {
        id: item.id,
        name: item.name,
        notes: "",
        quantity: 1,
        unitPriceMinor: item.currentPriceMinor ?? item.priceMinor,
        modifiers: [],
      },
    });

    setAddedToast(`Added "${item.name}" to cart!`);
    setTimeout(() => setAddedToast(null), 2500);
  }

  return (
    <div className="space-y-6">
      {addedToast && (
        <div className="grab-toast" role="status" aria-live="polite">
          <span className="grab-toast__msg">{addedToast}</span>
          <Link href="/cart" className="grab-toast__link">
            View Cart →
          </Link>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab("kitchens")}
          className={`pb-3 text-sm font-bold transition-colors relative flex items-center gap-2 ${
            activeTab === "kitchens"
              ? "text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400"
              : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Kitchens ({favoriteOutlets.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("dishes")}
          className={`pb-3 text-sm font-bold transition-colors relative flex items-center gap-2 ${
            activeTab === "dishes"
              ? "text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400"
              : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
          }`}
        >
          <Utensils className="w-4 h-4" />
          <span>Dishes ({favoriteItems.length})</span>
        </button>
      </div>

      {/* Content */}
      {isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : activeTab === "kitchens" ? (
        favoriteOutlets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 grid place-items-center mb-4">
              <Heart className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              No favorite kitchens yet
            </h2>
            <p className="text-sm text-gray-500 max-w-sm mt-1 mb-6">
              Tap the heart icon on any kitchen to save it here for fast reordering.
            </p>
            <Link
              href="/outlets"
              className="rsc-button rsc-button--primary inline-flex items-center gap-2"
            >
              <Store className="w-4 h-4" />
              <span>Explore Kitchens</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-3 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
            {favoriteOutlets.map((outlet) => (
              <OutletCard key={outlet.id} outlet={outlet} />
            ))}
          </div>
        )
      ) : favoriteItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 grid place-items-center mb-4">
            <Utensils className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            No favorite dishes yet
          </h2>
          <p className="text-sm text-gray-500 max-w-sm mt-1 mb-6">
            Save your go-to meals from kitchen menus to quickly add them to your cart in one tap.
          </p>
          <Link
            href="/outlets"
            className="rsc-button rsc-button--primary inline-flex items-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Discover Dishes</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {favoriteItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="relative h-40 w-full bg-gray-100 dark:bg-gray-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    item.imageUrl ||
                    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80"
                  }
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  aria-label={`Remove ${item.name} from favorites`}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 dark:bg-gray-900/90 text-red-500 grid place-items-center shadow-md hover:scale-110 transition-transform"
                >
                  <Heart className="w-4 h-4 fill-current" />
                </button>
              </div>

              <div className="p-4 flex flex-col flex-1">
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {item.outletName}
                </p>
                <h3 className="font-bold text-gray-900 dark:text-white text-base mt-0.5 mb-1 truncate">
                  {item.name}
                </h3>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1">
                  {item.description || "Delicious kitchen specialty."}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="font-bold text-gray-900 dark:text-white text-sm">
                    {formatNaira(item.currentPriceMinor ?? item.priceMinor)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(item)}
                    className="rsc-button rsc-button--primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
