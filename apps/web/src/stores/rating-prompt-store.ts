"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface RatingPromptState {
  promptedOrderByCustomer: Record<string, string>;
  activePromptOrderByCustomer: Record<string, string>;
  _hasHydrated: boolean;
  markPrompted: (customerId: string, orderId: string) => void;
  showPrompt: (customerId: string, orderId: string) => void;
  dismissPrompt: (customerId: string) => void;
  setHasHydrated: (value: boolean) => void;
}

export const useRatingPromptStore = create<RatingPromptState>()(
  persist(
    (set) => ({
      promptedOrderByCustomer: {},
      activePromptOrderByCustomer: {},
      _hasHydrated: false,
      markPrompted: (customerId, orderId) =>
        set((state) => ({
          promptedOrderByCustomer: {
            ...state.promptedOrderByCustomer,
            [customerId]: orderId,
          },
        })),
      showPrompt: (customerId, orderId) =>
        set((state) => ({
          promptedOrderByCustomer: {
            ...state.promptedOrderByCustomer,
            [customerId]: orderId,
          },
          activePromptOrderByCustomer: {
            ...state.activePromptOrderByCustomer,
            [customerId]: orderId,
          },
        })),
      dismissPrompt: (customerId) =>
        set((state) => {
          const activePromptOrderByCustomer = {
            ...state.activePromptOrderByCustomer,
          };
          delete activePromptOrderByCustomer[customerId];

          return { activePromptOrderByCustomer };
        }),
      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: "rsc-rating-prompts",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: ({ promptedOrderByCustomer }) => ({ promptedOrderByCustomer }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
