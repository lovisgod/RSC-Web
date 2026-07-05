import type { MenuItemSummary, OutletSummary } from "@rsc/contracts";

import type { Outlet } from "@/src/lib/data/outlets";

export interface DisplayModifier {
  id: string;
  name: string;
  priceDeltaMinor: number;
}

export interface DisplayModifierGroup {
  id: string;
  name: string;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  modifiers: DisplayModifier[];
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
  image: string;
  bgColor: string;
  modifierGroups: DisplayModifierGroup[];
}

export interface MenuCategory {
  id: string;
  name: string;
}

export interface OutletMenu {
  outletId: string;
  outletName: string;
  cuisines: string[];
  isOnline: boolean;
  headerColor: string;
  image: string;
  categories: MenuCategory[];
  items: MenuItem[];
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

export function toDisplayMenuItem(
  item: MenuItemSummary,
  index: number,
  modifierGroups: DisplayModifierGroup[] = [],
): MenuItem {
  return {
    id: item.id,
    outletId: item.outletId,
    categoryId: item.categoryId,
    name: item.name,
    description: item.description ?? "",
    imageUrl: item.imageUrl,
    priceMinor: item.priceMinor,
    isAvailable: item.isAvailable,
    image: item.imageUrl ?? FOOD_EMOJIS[index % FOOD_EMOJIS.length]!,
    bgColor: BG_COLORS[index % BG_COLORS.length]!,
    modifierGroups,
  };
}

export function buildOutletMenu(outlet: Outlet, summary: OutletSummary): OutletMenu {
  // Build available modifier options per group
  const modifiersByGroup = new Map<string, DisplayModifier[]>();
  const sortedModifiers = [...summary.itemModifiers]
    .filter((m) => m.isAvailable)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  for (const mod of sortedModifiers) {
    const arr = modifiersByGroup.get(mod.groupId) ?? [];
    arr.push({ id: mod.id, name: mod.name, priceDeltaMinor: mod.priceDeltaMinor });
    modifiersByGroup.set(mod.groupId, arr);
  }

  // Index modifier groups by id
  const groupById = new Map(summary.itemModifierGroups.map((g) => [g.id, g]));

  // Index modifier group links by menuItemId, sorted by sortOrder
  const linksByItem = new Map<string, { groupId: string; sortOrder: number }[]>();
  for (const link of summary.menuItemModifierGroups) {
    const arr = linksByItem.get(link.menuItemId) ?? [];
    arr.push({ groupId: link.groupId, sortOrder: link.sortOrder });
    linksByItem.set(link.menuItemId, arr);
  }

  const items = summary.menuItems
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item, i) => {
      const links = (linksByItem.get(item.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder);
      const modifierGroups: DisplayModifierGroup[] = links
        .map(({ groupId }) => {
          const g = groupById.get(groupId);
          if (!g) return null;
          return {
            id: g.id,
            name: g.name,
            isRequired: g.isRequired,
            minSelections: g.minSelections,
            maxSelections: g.maxSelections,
            modifiers: modifiersByGroup.get(groupId) ?? [],
          };
        })
        .filter((g): g is DisplayModifierGroup => g !== null);

      return toDisplayMenuItem(item, i, modifierGroups);
    });

  const namedCategories = summary.menuCategories
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
    isOnline: outlet.isOnline ?? true,
    headerColor: outlet.headerColor,
    image: outlet.image,
    categories,
    items,
  };
}
