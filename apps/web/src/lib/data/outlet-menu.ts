import type { MenuCategorySummary, MenuItemSummary } from "@rsc/contracts";

import type { Outlet } from "@/src/lib/data/outlets";

export interface MenuExtra {
  id: string;
  name: string;
  priceMinor: number;
}

export interface MenuItem {
  id: string;
  outletId: string;
  categoryId: string;
  name: string;
  description: string;
  imageUrl: string | null;
  priceMinor: number;
  isAvailable: boolean;
  // Local display fields — derived from API data
  image: string;
  bgColor: string;
  // Not yet returned by the API
  extras?: MenuExtra[];
  note?: string;
}

export interface MenuCategory {
  id: string;
  name: string;
}

export interface OutletMenu {
  outletId: string;
  outletName: string;
  cuisines: string[];
  headerColor: string;
  image: string;
  categories: MenuCategory[];
  items: MenuItem[];
  // Not yet returned by the API
  rating?: number;
  deliveryTime?: string;
  deliveryFeeMinor?: number;
}

const FOOD_EMOJIS = ["🍲", "🥗", "🍛", "🍜", "🥘", "🍱", "🍖", "🍗", "🥩", "🍝"];
const BG_COLORS = [
  "#FFF3E0",
  "#F3E5F5",
  "#E8F5E9",
  "#E3F2FD",
  "#FBE9E7",
  "#FFF8E1",
  "#FCE4EC",
  "#F1F8E9",
  "#FFFDE7",
  "#EFEBE9",
];

export function toDisplayMenuItem(item: MenuItemSummary, index: number): MenuItem {
  return {
    id: item.id,
    outletId: item.outletId,
    categoryId: item.categoryId,
    name: item.name,
    description: item.description,
    imageUrl: item.imageUrl,
    priceMinor: item.priceMinor,
    isAvailable: item.isAvailable,
    image: item.imageUrl ?? FOOD_EMOJIS[index % FOOD_EMOJIS.length]!,
    bgColor: BG_COLORS[index % BG_COLORS.length]!,
  };
}

export function buildOutletMenu(
  outlet: Outlet,
  rawItems: MenuItemSummary[],
  rawCategories: MenuCategorySummary[],
): OutletMenu {
  const items = rawItems
    .filter((item) => item.isAvailable)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item, i) => toDisplayMenuItem(item, i));

  const namedCategories = rawCategories
    .filter((c) => c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({ id: c.id, name: c.name }));

  const categories: MenuCategory[] =
    namedCategories.length > 0
      ? [{ id: "all", name: "All" }, ...namedCategories]
      : [{ id: "all", name: "Menu" }];

  return {
    outletId: outlet.id,
    outletName: outlet.name,
    cuisines: outlet.cuisines,
    headerColor: outlet.headerColor,
    image: outlet.image,
    categories,
    items,
  };
}
