"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/src/lib/api";

export function usePlatformCharges() {
  return useQuery({
    queryKey: ["platform-charges"],
    queryFn: () => apiClient.getPlatformCharges(),
    staleTime: 10 * 60 * 1000, // charges rarely change — cache 10 min
  });
}

/** Calculate all fees from subtotal + platform charges (all values in minor units / kobo). */
export function calcCharges(
  subtotalMinor: number,
  charges: {
    platformCommissionBps: number;
    defaultVatBps: number;
    deliveryFeeMinor: number;
    serviceFeeMinor: number;
  },
) {
  const commission = Math.round((subtotalMinor * charges.platformCommissionBps) / 10_000);
  const vat = Math.round((subtotalMinor * charges.defaultVatBps) / 10_000);
  const delivery = charges.deliveryFeeMinor;
  const service = charges.serviceFeeMinor;
  const total = subtotalMinor + commission + vat + delivery + service;
  return { commission, vat, delivery, service, total };
}
