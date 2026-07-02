import { useCartStore } from "@/src/stores/cart-store";
import type { Cart } from "@/src/lib/data/cart";

export function useCart(): { data: Cart; isPending: false; isError: false } {
  const cart = useCartStore((s) => s.cart);
  return { data: cart, isPending: false, isError: false };
}
