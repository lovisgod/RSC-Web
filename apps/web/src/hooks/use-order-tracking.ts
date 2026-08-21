"use client";

import { useEffect, useState } from "react";

import {
  type CustomerOrder,
  masterOrderStatusSchema,
  type PaginatedCustomerOrders,
  riderLocationSchema,
  type OrderDetail,
  type RiderLocation,
} from "@rsc/contracts";
import { type QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { z } from "zod";

import { apiClient } from "@/src/lib/api";

const orderStatusUpdateSchema = z
  .object({
    masterOrderId: z.uuid(),
    customerId: z.uuid().optional(),
    riderId: z.uuid().nullable().optional(),
    status: masterOrderStatusSchema,
    updatedAt: z.string().min(1),
  })
  .passthrough();

const orderRoomPayloadSchema = z.object({
  room: z.string().min(1),
});

function getRealtimeOrigin() {
  return (
    process.env.NEXT_PUBLIC_REALTIME_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    window.location.origin
  );
}

function getOrderSourceId(orderId: string) {
  return orderId.split(":")[0] ?? orderId;
}

function matchesCustomerOrder(order: CustomerOrder, orderId: string, sourceOrderId: string) {
  return (
    order.id === orderId ||
    order.id === sourceOrderId ||
    order.customerViewId === orderId ||
    order.customerViewId === sourceOrderId ||
    order.sourceMasterOrderId === sourceOrderId
  );
}

export function syncCustomerOrderStatusCache(
  queryClient: QueryClient,
  input: {
    orderId: string;
    sourceOrderId?: string | undefined;
    riderId?: string | null | undefined;
    status: string;
    updatedAt?: string | undefined;
  },
) {
  const sourceOrderId = input.sourceOrderId ?? getOrderSourceId(input.orderId);

  queryClient.setQueriesData<PaginatedCustomerOrders>({ queryKey: ["orders"] }, (current) => {
    if (!current) return current;

    let changed = false;
    const orders = current.orders.map((order) => {
      if (!matchesCustomerOrder(order, input.orderId, sourceOrderId)) {
        return order;
      }

      changed = true;

      return {
        ...order,
        riderId: input.riderId ?? order.riderId,
        status: input.status,
        updatedAt: input.updatedAt ?? order.updatedAt,
      };
    });

    return changed ? { ...current, orders } : current;
  });
}

export function useOrderDetail(orderId: string | null) {
  const queryClient = useQueryClient();
  const sourceOrderId = orderId ? getOrderSourceId(orderId) : null;
  const query = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => apiClient.getOrder(orderId!),
    enabled: !!orderId,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!orderId || !sourceOrderId) return;

    const room = `order:${sourceOrderId}`;
    const socket = io(`${getRealtimeOrigin()}/realtime`, {
      path: "/socket.io",
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      socket.emit("room:subscribe", { room });
    });

    socket.on("room:subscribed", (payload: unknown) => {
      const parsed = orderRoomPayloadSchema.safeParse(payload);
      if (parsed.success && parsed.data.room === room) {
        void queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      }
    });

    socket.on("order:status_update", (payload: unknown) => {
      const parsed = orderStatusUpdateSchema.safeParse(payload);
      if (!parsed.success || parsed.data.masterOrderId !== sourceOrderId) return;

      queryClient.setQueryData<OrderDetail>(["order", orderId], (current) =>
        current
          ? {
              ...current,
              order: {
                ...current.order,
                riderId: parsed.data.riderId ?? current.order.riderId,
                status: parsed.data.status,
                updatedAt: parsed.data.updatedAt,
              },
            }
          : current,
      );
      syncCustomerOrderStatusCache(queryClient, {
        orderId,
        sourceOrderId,
        riderId: parsed.data.riderId,
        status: parsed.data.status,
        updatedAt: parsed.data.updatedAt,
      });

      void queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      void queryClient.invalidateQueries({ queryKey: ["orders"], refetchType: "active" });
    });

    socket.on("rider:location_update", (payload: unknown) => {
      const parsed = riderLocationSchema.safeParse(payload);
      if (!parsed.success || parsed.data.masterOrderId !== sourceOrderId) return;

      queryClient.setQueryData<RiderLocation>(["order", orderId, "rider-location"], parsed.data);
    });

    return () => {
      socket.emit("room:unsubscribe", { room });
      socket.disconnect();
    };
  }, [orderId, queryClient, sourceOrderId]);

  return query;
}

type TrackingConnection = "connecting" | "live" | "reconnecting" | "idle";

export function useRiderTracking(orderId: string | null, enabled: boolean) {
  const queryClient = useQueryClient();
  const [realtimeState, setRealtimeState] = useState<{
    orderId: string;
    connection: TrackingConnection;
  } | null>(null);

  const latestLocationQuery = useQuery({
    queryKey: ["order", orderId, "rider-location"],
    queryFn: () => apiClient.getRiderLocation(orderId!),
    enabled: !!orderId && enabled,
    retry: 1,
  });

  useEffect(() => {
    if (!orderId || !enabled) return;

    const room = `order:${orderId}`;
    const socket = io(`${getRealtimeOrigin()}/realtime`, {
      path: "/socket.io",
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      socket.emit("room:subscribe", { room });
      setRealtimeState({ orderId, connection: "live" });
    });

    socket.on("reconnect_attempt", () => {
      setRealtimeState({ orderId, connection: "reconnecting" });
    });

    socket.on("disconnect", () => {
      setRealtimeState({ orderId, connection: "reconnecting" });
    });

    socket.on("rider:location_update", (payload: unknown) => {
      const parsed = riderLocationSchema.safeParse(payload);
      if (!parsed.success || parsed.data.masterOrderId !== orderId) return;

      queryClient.setQueryData<RiderLocation>(["order", orderId, "rider-location"], parsed.data);
      setRealtimeState({ orderId, connection: "live" });
    });

    socket.on("connect_error", () => {
      setRealtimeState({ orderId, connection: "reconnecting" });
      void queryClient.invalidateQueries({ queryKey: ["order", orderId, "rider-location"] });
    });

    return () => {
      socket.emit("room:unsubscribe", { room });
      socket.disconnect();
    };
  }, [enabled, orderId, queryClient]);

  const location = latestLocationQuery.data ?? null;
  const connection: TrackingConnection =
    !enabled || !orderId
      ? "idle"
      : realtimeState?.orderId === orderId
        ? realtimeState.connection
        : "connecting";

  return {
    location,
    connection,
    isLoading: latestLocationQuery.isPending && !location,
    isUnavailable: latestLocationQuery.isFetched && !location && latestLocationQuery.isError,
  };
}
