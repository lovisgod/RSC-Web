import { useEffect, useState } from "react";

function formatClock(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const day = d.getDate();
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  return `${day} ${month} · ${hh}:${mm}:${ss}`;
}

export function useLiveClock(): string {
  const [clock, setClock] = useState(() => formatClock(new Date()));

  useEffect(() => {
    const id = setInterval(() => setClock(formatClock(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return clock;
}
