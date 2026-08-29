"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface FavoritesState {
  outletIds: string[];
  itemIds: string[];
  toggleOutlet: (outletId: string) => void;
  toggleItem: (itemId: string) => void;
  isOutletFavorite: (outletId: string) => boolean;
  isItemFavorite: (itemId: string) => boolean;
  clear: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      outletIds: [],
      itemIds: [],
      toggleOutlet: (outletId) =>
        set((state) => ({
          outletIds: state.outletIds.includes(outletId)
            ? state.outletIds.filter((id) => id !== outletId)
            : [...state.outletIds, outletId],
        })),
      toggleItem: (itemId) =>
        set((state) => ({
          itemIds: state.itemIds.includes(itemId)
            ? state.itemIds.filter((id) => id !== itemId)
            : [...state.itemIds, itemId],
        })),
      isOutletFavorite: (outletId) => get().outletIds.includes(outletId),
      isItemFavorite: (itemId) => get().itemIds.includes(itemId),
      clear: () => set({ outletIds: [], itemIds: [] }),
    }),
    {
      name: "rsc-favorites",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
