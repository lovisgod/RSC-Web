"use client";

import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/src/lib/api";
import type { RiderLocation } from "@rsc/contracts";
import { riderLocationSchema } from "@rsc/contracts";

export function useOrderDetail(orderId: string | null) {
  return useQuery({
    queryKey: ["order", orderId],
    queryFn: () => apiClient.getOrder(orderId!),
    enabled: !!orderId,
    refetchInterval: 30_000,
  });
}

export function useRiderLocationStream(
  orderId: string | null,
  enabled: boolean,
): RiderLocation | null {
  const [streamLocation, setStreamLocation] = useState<{
    orderId: string;
    location: RiderLocation;
  } | null>(null);

  useEffect(() => {
    if (!orderId || !enabled) return;

    const es = new EventSource(
      `/api/v1/orders/${encodeURIComponent(orderId)}/rider-location/stream`,
    );

    es.onmessage = (event) => {
      try {
        const raw: unknown = JSON.parse(event.data as string);
        if (raw && typeof raw === "object" && "latitude" in raw) {
          const parsed = riderLocationSchema.safeParse(raw);
          if (parsed.success) setStreamLocation({ orderId, location: parsed.data });
        }
      } catch {
        // ignore parse failures — empty `{}` ticks are expected
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, [orderId, enabled]);

  return enabled && orderId && streamLocation?.orderId === orderId ? streamLocation.location : null;
}
