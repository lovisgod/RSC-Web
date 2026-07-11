import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io } from "socket.io-client";

import { outletAdminKeys } from "../lib/query-keys";

const SUBORDER_NEW_EVENT = "suborder:new";
const MENU_ITEM_AVAILABILITY_EVENT = "menu_item:availability_update";

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

export function useOutletRealtime(outletId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!outletId) {
      return;
    }

    const room = `outlet:${outletId}`;
    const socket = io(`${getRealtimeOrigin()}/realtime`, {
      path: "/socket.io",
      withCredentials: true,
      transports: ["polling"],
    });

    function refreshOutletQueue() {
      void queryClient.invalidateQueries({ queryKey: outletAdminKeys.orders(outletId) });
    }

    socket.on("connect", () => {
      socket.emit("room:subscribe", { room });
    });

    socket.on("room:subscribed", (event: { room?: string }) => {
      if (event.room === room) {
        refreshOutletQueue();
      }
    });

    socket.on(SUBORDER_NEW_EVENT, refreshOutletQueue);
    socket.on(MENU_ITEM_AVAILABILITY_EVENT, (event: MenuItemAvailabilityUpdateEvent) => {
      if (event.outletId !== outletId) return;

      void queryClient.invalidateQueries({ queryKey: outletAdminKeys.outlet.detail(outletId) });
      void queryClient.invalidateQueries({
        queryKey: outletAdminKeys.menuItem.detail(event.menuItemId),
      });
    });

    return () => {
      socket.emit("room:unsubscribe", { room });
      socket.disconnect();
    };
  }, [outletId, queryClient]);
}
