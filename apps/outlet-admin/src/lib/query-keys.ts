export const outletAdminKeys = {
  outlet: {
    root: (outletId: string) => ["pos", "outlet", outletId] as const,
    detail: (outletId: string) => [...outletAdminKeys.outlet.root(outletId), "detail"] as const,
  },
  menuItem: {
    root: () => ["pos", "menu-item"] as const,
    detail: (itemId: string | null) => [...outletAdminKeys.menuItem.root(), itemId] as const,
  },
  modifierGroups: (outletId: string) => ["pos", "modifier-groups", outletId] as const,
  orders: (outletId: string) => ["pos", "orders", outletId] as const,
};
