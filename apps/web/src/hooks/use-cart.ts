import { useQuery } from "@tanstack/react-query";

import { DUMMY_CART, type Cart } from "@/src/lib/data/cart";

export const cartQueryKey = ["cart"] as const;

export function useCart() {
  return useQuery<Cart>({
    queryKey: cartQueryKey,
    queryFn: async () => {
      // TODO: replace with apiClient.getCart()
      await new Promise((r) => setTimeout(r, 400));
      return DUMMY_CART;
    },
    staleTime: 0,
  });
}
