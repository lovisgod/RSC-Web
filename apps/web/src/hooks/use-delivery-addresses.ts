"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/src/lib/api";

const KEY = ["delivery-addresses"] as const;

export function useDeliveryAddresses() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiClient.listDeliveryAddresses(),
  });
}

export function useDeleteDeliveryAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteDeliveryAddress(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSetDefaultDeliveryAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.setDefaultDeliveryAddress(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
