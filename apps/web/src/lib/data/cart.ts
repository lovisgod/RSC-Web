export interface CartItem {
  id: string;
  name: string;
  notes: string;
  quantity: number;
  unitPriceMinor: number;
}

export interface CartOutletGroup {
  outletId: string;
  outletName: string;
  items: CartItem[];
}

export interface Cart {
  groups: CartOutletGroup[];
  deliveryFeeMinor: number;
}

export function outletSubtotalMinor(group: CartOutletGroup): number {
  return group.items.reduce((sum, item) => sum + item.unitPriceMinor * item.quantity, 0);
}

export function cartSubtotalMinor(cart: Cart): number {
  return cart.groups.reduce((sum, g) => sum + outletSubtotalMinor(g), 0);
}

export function formatNaira(minor: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

export function itemLabel(item: CartItem): string {
  const qty = item.quantity > 1 ? ` x${item.quantity}` : "";
  const note = item.notes ? ` · ${item.notes}` : "";
  return `${item.name}${qty}${note}`;
}

export function cartItemCount(cart: Cart): number {
  return cart.groups.reduce((sum, g) => sum + g.items.reduce((s, i) => s + i.quantity, 0), 0);
}
