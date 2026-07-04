import { useEffect, useRef } from "react";
import type { PosSubOrder } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

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
  const seenRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const currentIds = new Set(orders.map((o) => o.id));

    if (seenRef.current === null) {
      seenRef.current = currentIds;
      return;
    }

    const newCount = [...currentIds].filter((id) => !seenRef.current!.has(id)).length;
    if (newCount > 0) {
      chime();
      toastBus.emit(`${newCount} new order${newCount > 1 ? "s" : ""} received`, "success");
    }

    seenRef.current = currentIds;
  }, [orders]);
}
