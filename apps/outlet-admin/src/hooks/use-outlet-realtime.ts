import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io } from "socket.io-client";

import { outletAdminKeys } from "../lib/query-keys";

const SUBORDER_NEW_EVENT = "suborder:new";

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
      transports: ["websocket", "polling"],
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

    return () => {
      socket.emit("room:unsubscribe", { room });
      socket.disconnect();
    };
  }, [outletId, queryClient]);
}
