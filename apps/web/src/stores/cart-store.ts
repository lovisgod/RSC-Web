"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Cart, CartItem } from "@/src/lib/data/cart";

interface AddItemParams {
  outletId: string;
  outletName: string;
  item: CartItem;
}

interface CartState {
  cart: Cart;
  addItem: (params: AddItemParams) => void;
  removeItem: (outletId: string, itemId: string) => void;
  updateQuantity: (outletId: string, itemId: string, quantity: number) => void;
  clear: () => void;
}

const EMPTY_CART: Cart = { groups: [], deliveryFeeMinor: 0 };

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      cart: EMPTY_CART,

      addItem: ({ outletId, outletName, item }) =>
        set((state) => {
          const groups = [...state.cart.groups];
          const groupIdx = groups.findIndex((g) => g.outletId === outletId);

          if (groupIdx === -1) {
            groups.push({ outletId, outletName, items: [item] });
          } else {
            const group = { ...groups[groupIdx]!, items: [...groups[groupIdx]!.items] };
            const existingIdx = group.items.findIndex((i) => i.id === item.id);

            if (existingIdx === -1) {
              group.items.push(item);
            } else {
              group.items[existingIdx] = {
                ...group.items[existingIdx]!,
                quantity: group.items[existingIdx]!.quantity + item.quantity,
              };
            }
            groups[groupIdx] = group;
          }

          return { cart: { ...state.cart, groups } };
        }),

      removeItem: (outletId, itemId) =>
        set((state) => {
          const groups = state.cart.groups
            .map((g) =>
              g.outletId !== outletId ? g : { ...g, items: g.items.filter((i) => i.id !== itemId) },
            )
            .filter((g) => g.items.length > 0);
          return { cart: { ...state.cart, groups } };
        }),

      updateQuantity: (outletId, itemId, quantity) =>
        set((state) => {
          if (quantity <= 0) return state;
          const groups = state.cart.groups.map((g) =>
            g.outletId !== outletId
              ? g
              : { ...g, items: g.items.map((i) => (i.id === itemId ? { ...i, quantity } : i)) },
          );
          return { cart: { ...state.cart, groups } };
        }),

      clear: () => set({ cart: EMPTY_CART }),
    }),
    {
      name: "rsc-customer-cart",
      storage: createJSONStorage(() => localStorage),
      version: 3,
    },
  ),
);
