import { useEffect, useRef } from "react";
import type { PosSubOrder } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

type AlertableOrder = Pick<PosSubOrder, "id" | "status">;

export function getUnseenIncomingOrderIds(
  orders: AlertableOrder[],
  seenIncomingIds: ReadonlySet<string>,
): string[] {
  return orders
    .filter((order) => order.status === "PENDING" && !seenIncomingIds.has(order.id))
    .map((order) => order.id);
}

function chime() {
  try {
    const ctx = new AudioContext();
    [0, 0.18].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.35);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.35);
    });
  } catch {
    // AudioContext unavailable
  }
}

export function useNewOrderAlert(orders: PosSubOrder[]) {
  const seenIncomingIdsRef = useRef(new Set<string>());
  const isInitializedRef = useRef(false);

  useEffect(() => {
    const incomingIds = orders
      .filter((order) => order.status === "PENDING")
      .map((order) => order.id);

    if (!isInitializedRef.current) {
      incomingIds.forEach((id) => seenIncomingIdsRef.current.add(id));
      isInitializedRef.current = true;
      return;
    }

    const unseenIncomingIds = getUnseenIncomingOrderIds(orders, seenIncomingIdsRef.current);
    unseenIncomingIds.forEach((id) => seenIncomingIdsRef.current.add(id));

    const newCount = unseenIncomingIds.length;
    if (newCount > 0) {
      chime();
      toastBus.emit(`${newCount} new order${newCount > 1 ? "s" : ""} received`, "success");
    }
  }, [orders]);
}
