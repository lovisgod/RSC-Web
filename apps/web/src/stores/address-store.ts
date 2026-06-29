"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface SavedDefaultAddress {
  label: string;
  addressLine: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
}

interface AddressState {
  defaultAddress: SavedDefaultAddress | null;
  setDefaultAddress: (address: SavedDefaultAddress) => void;
  clear: () => void;
}

export const useAddressStore = create<AddressState>()(
  persist(
    (set) => ({
      defaultAddress: null,
      setDefaultAddress: (address) => set({ defaultAddress: address }),
      clear: () => set({ defaultAddress: null }),
    }),
    {
      name: "rsc-default-address",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
