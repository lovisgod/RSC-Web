import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { outletAdminKeys } from "../lib/query-keys";
import { useOutletRealtime } from "./use-outlet-realtime";

type SocketHandler = (event?: never) => void;

const socket = vi.hoisted(() => {
  const handlers = new Map<string, SocketHandler>();
  return {
    handlers,
    on: vi.fn((event: string, handler: SocketHandler) => {
      handlers.set(event, handler);
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
  };
});

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => socket),
}));

vi.mock("../lib/toast-bus", () => ({
  toastBus: { emit: vi.fn() },
}));

function Probe({ outletId }: { outletId: string }) {
  useOutletRealtime(outletId);
  return null;
}

describe("useOutletRealtime", () => {
  beforeEach(() => {
    socket.handlers.clear();
    socket.on.mockClear();
    socket.emit.mockClear();
    socket.disconnect.mockClear();
  });

  it("subscribes to its outlet, refreshes matching paid orders, and cleans up", async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const view = render(
      <QueryClientProvider client={queryClient}>
        <Probe outletId="outlet-1" />
      </QueryClientProvider>,
    );

    act(() => socket.handlers.get("connect")?.());
    expect(socket.emit).toHaveBeenCalledWith("room:subscribe", { room: "outlet:outlet-1" });

    act(() => {
      socket.handlers.get("suborder:confirmed")?.({
        outletId: "outlet-1",
      } as never);
    });
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: outletAdminKeys.orders("outlet-1"),
      });
    });

    invalidate.mockClear();
    act(() => {
      socket.handlers.get("suborder:confirmed")?.({
        outletId: "outlet-2",
      } as never);
    });
    expect(invalidate).not.toHaveBeenCalled();

    view.unmount();
    expect(socket.emit).toHaveBeenCalledWith("room:unsubscribe", { room: "outlet:outlet-1" });
    expect(socket.disconnect).toHaveBeenCalledOnce();
  });
});
