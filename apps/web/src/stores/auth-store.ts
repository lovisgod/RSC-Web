"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AuthState {
  isSignedIn: boolean;
  signIn: () => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isSignedIn: false,
      signIn: () => set({ isSignedIn: true }),
      signOut: () => set({ isSignedIn: false }),
    }),
    {
      name: "rsc-auth-session",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
