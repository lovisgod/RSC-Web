"use client";

import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import type { RiderLocation } from "@rsc/contracts";

import { apiClient } from "@/src/lib/api";
import { ACTIVE_ORDER_STATUSES } from "@/src/lib/data/orders";
import { parseRiderLocationEvent } from "@/src/lib/data/rider-location";

export function useOrderDetail(orderId: string | null) {
  return useQuery({
    queryKey: ["order", orderId],
    queryFn: () => apiClient.getOrder(orderId!),
    enabled: !!orderId,
    refetchInterval: (query) => {
      const status = query.state.data?.order.status.toUpperCase();
      return status && ACTIVE_ORDER_STATUSES.has(status) ? 12_000 : false;
    },
    refetchOnWindowFocus: true,
  });
}

type TrackingConnection = "connecting" | "live" | "reconnecting" | "idle";

export function useRiderTracking(orderId: string | null, enabled: boolean) {
  const [streamState, setStreamState] = useState<{
    orderId: string;
    location: RiderLocation | null;
    connection: TrackingConnection;
  } | null>(null);

  const latestLocationQuery = useQuery({
    queryKey: ["order", orderId, "rider-location"],
    queryFn: () => apiClient.getRiderLocation(orderId!),
    enabled: !!orderId && enabled,
    refetchInterval:
      streamState?.orderId === orderId && streamState.connection === "reconnecting"
        ? 10_000
        : false,
    retry: 1,
  });

  useEffect(() => {
    if (!orderId || !enabled || !latestLocationQuery.isFetched) return;

    const stream = new EventSource(
      `/api/v1/orders/${encodeURIComponent(orderId)}/rider-location/stream`,
      { withCredentials: true },
    );

    stream.onmessage = (event) => {
      const location = parseRiderLocationEvent(event.data);
      if (!location) return;

      setStreamState({ orderId, location, connection: "live" });
    };

    stream.onerror = () => {
      stream.close();
      setStreamState((current) => ({
        orderId,
        location: current?.orderId === orderId ? current.location : null,
        connection: "reconnecting",
      }));
    };

    return () => stream.close();
  }, [enabled, latestLocationQuery.isFetched, orderId]);

  const streamLocation = streamState?.orderId === orderId ? streamState.location : null;
  const location = streamLocation ?? latestLocationQuery.data ?? null;
  const connection: TrackingConnection =
    !enabled || !orderId
      ? "idle"
      : streamState?.orderId === orderId
        ? streamState.connection
        : "connecting";

  return {
    location,
    connection,
    isLoading: latestLocationQuery.isPending && !location,
    isUnavailable: latestLocationQuery.isFetched && !location && latestLocationQuery.isError,
  };
}
