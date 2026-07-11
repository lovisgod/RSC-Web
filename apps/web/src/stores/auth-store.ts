"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AuthState {
  isSignedIn: boolean;
  userId: string | null;
  _hasHydrated: boolean;
  signIn: (userId: string) => void;
  signOut: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isSignedIn: false,
      userId: null,
      _hasHydrated: false,
      signIn: (userId) => set({ isSignedIn: true, userId }),
      signOut: () => set({ isSignedIn: false, userId: null }),
      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: "rsc-auth-session",
      storage: createJSONStorage(() => sessionStorage),
      // _hasHydrated must not be persisted — it should always start false
      partialize: ({ isSignedIn, userId }) => ({ isSignedIn, userId }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
