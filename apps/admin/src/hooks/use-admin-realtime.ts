import type { OutletSummary } from "@rsc/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io } from "socket.io-client";

const PLATFORM_ADMIN_ROOM = "platform:admin";

interface OutletStatusUpdateEvent {
  outletId: string;
  isOnline: boolean;
}

interface MenuItemAvailabilityUpdateEvent {
  menuItemId: string;
  outletId: string;
  isAvailable: boolean;
}

function getRealtimeOrigin() {
  return (
    import.meta.env.VITE_REALTIME_URL || import.meta.env.VITE_API_BASE_URL || window.location.origin
  );
}

export function useAdminRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = io(`${getRealtimeOrigin()}/realtime`, {
      path: "/socket.io",
      withCredentials: true,
      transports: ["polling"],
    });

    function refreshOrdersAndStats() {
      void queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stats", "operations"] });
    }

    socket.on("connect", () => {
      socket.emit("room:subscribe", { room: PLATFORM_ADMIN_ROOM });
    });

    socket.on("room:subscribed", (event: { room?: string }) => {
      if (event.room === PLATFORM_ADMIN_ROOM) {
        refreshOrdersAndStats();
      }
    });

    socket.on("suborder:new", refreshOrdersAndStats);

    socket.on("order:status_update", refreshOrdersAndStats);

    socket.on("outlet:status_update", (event: OutletStatusUpdateEvent) => {
      queryClient.setQueriesData<OutletSummary[]>({ queryKey: ["admin", "outlets"] }, (outlets) =>
        outlets?.map((outlet) =>
          outlet.id === event.outletId ? { ...outlet, isOnline: event.isOnline } : outlet,
        ),
      );

      void queryClient.invalidateQueries({ queryKey: ["admin", "stats", "operations"] });
    });

    socket.on("menu_item:availability_update", (event: MenuItemAvailabilityUpdateEvent) => {
      queryClient.setQueryData<OutletSummary[]>(["admin", "outlets"], (outlets) =>
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

      void queryClient.invalidateQueries({ queryKey: ["menu-items"] });
    });

    return () => {
      socket.emit("room:unsubscribe", { room: PLATFORM_ADMIN_ROOM });
      socket.disconnect();
    };
  }, [queryClient]);
}
