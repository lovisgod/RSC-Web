"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AuthState {
  isSignedIn: boolean;
  _hasHydrated: boolean;
  signIn: () => void;
  signOut: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isSignedIn: false,
      _hasHydrated: false,
      signIn: () => set({ isSignedIn: true }),
      signOut: () => set({ isSignedIn: false }),
      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: "rsc-auth-session",
      storage: createJSONStorage(() => sessionStorage),
      // _hasHydrated must not be persisted — it should always start false
      partialize: ({ isSignedIn }) => ({ isSignedIn }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
