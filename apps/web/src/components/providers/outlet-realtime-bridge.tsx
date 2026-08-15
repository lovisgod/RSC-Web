"use client";

import type { OutletSummary } from "@rsc/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

import { OUTLETS_QUERY } from "@/src/hooks/use-outlets";
import { isPublicWebRoute } from "@/src/lib/public-routes";

interface OutletStatusUpdateEvent {
  outletId: string;
  isOnline: boolean;
  updatedAt: string;
}

interface MenuItemAvailabilityUpdateEvent {
  menuItemId: string;
  outletId: string;
  isAvailable: boolean;
  updatedAt: string;
}

export function OutletRealtimeBridge() {
  const queryClient = useQueryClient();
  const hasConnectedRef = useRef(false);

  useEffect(() => {
    if (window.location.pathname === "/" || isPublicWebRoute(window.location.pathname)) {
      void queryClient.prefetchQuery(OUTLETS_QUERY);
    }

    const origin =
      process.env.NEXT_PUBLIC_REALTIME_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      window.location.origin;
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

    socket.on("menu_item:availability_update", (event: MenuItemAvailabilityUpdateEvent) => {
      queryClient.setQueryData<OutletSummary[]>(OUTLETS_QUERY.queryKey, (outlets) =>
        outlets?.map((outlet) => {
          if (outlet.id !== event.outletId) return outlet;
          return {
            ...outlet,
            menuItems: outlet.menuItems.map((item) =>
              item.id === event.menuItemId ? { ...item, isAvailable: event.isAvailable } : item,
            ),
          };
        }),
      );
      void queryClient.invalidateQueries({ queryKey: ["menu-items-search"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  return null;
}
