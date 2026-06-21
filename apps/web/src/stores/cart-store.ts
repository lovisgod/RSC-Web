"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface CartState {
  itemCount: number;
  clear: () => void;
  setItemCount: (itemCount: number) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      itemCount: 0,
      clear: () => set({ itemCount: 0 }),
      setItemCount: (itemCount) => set({ itemCount }),
    }),
    {
      name: "rsc-customer-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ itemCount }) => ({ itemCount }),
      version: 1,
    },
  ),
);
