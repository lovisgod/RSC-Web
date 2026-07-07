"use client";

import type { OutletSummary } from "@rsc/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

import { OUTLETS_QUERY } from "@/src/hooks/use-outlets";

interface OutletStatusUpdateEvent {
  outletId: string;
  isOnline: boolean;
  updatedAt: string;
}

export function OutletRealtimeBridge() {
  const queryClient = useQueryClient();
  const hasConnectedRef = useRef(false);

  useEffect(() => {
    const origin = process.env.NEXT_PUBLIC_REALTIME_URL || window.location.origin;
    const socket = io(`${origin}/realtime`, {
      path: "/socket.io",
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      if (hasConnectedRef.current) {
        void queryClient.invalidateQueries({ queryKey: OUTLETS_QUERY.queryKey });
      }

      hasConnectedRef.current = true;
    });

    socket.on("outlet:status_update", (event: OutletStatusUpdateEvent) => {
      queryClient.setQueryData<OutletSummary[]>(OUTLETS_QUERY.queryKey, (outlets) =>
        outlets?.map((outlet) =>
          outlet.id === event.outletId ? { ...outlet, isOnline: event.isOnline } : outlet,
        ),
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  return null;
}
