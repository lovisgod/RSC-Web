import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAdminRealtime } from "./use-admin-realtime";

type SocketHandler = () => void;

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

function Probe() {
  useAdminRealtime();
  return null;
}

describe("useAdminRealtime", () => {
  beforeEach(() => {
    socket.handlers.clear();
    socket.on.mockClear();
    socket.emit.mockClear();
    socket.disconnect.mockClear();
  });

  it("subscribes to platform updates, refreshes operational data, and cleans up", async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const view = render(
      <QueryClientProvider client={queryClient}>
        <Probe />
      </QueryClientProvider>,
    );

    act(() => socket.handlers.get("connect")?.());
    expect(socket.emit).toHaveBeenCalledWith("room:subscribe", { room: "platform:admin" });

    act(() => socket.handlers.get("order:status_update")?.());
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["admin", "orders"] });
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ["admin", "stats", "operations"],
      });
    });

    view.unmount();
    expect(socket.emit).toHaveBeenCalledWith("room:unsubscribe", { room: "platform:admin" });
    expect(socket.disconnect).toHaveBeenCalledOnce();
  });
});
