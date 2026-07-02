"use client";

import type { OrderStatusEvent } from "@rsc/contracts";

interface TimelineStep {
  key: string;
  label: string;
  matchStatuses: string[];
}

const STEPS: TimelineStep[] = [
  { key: "CONFIRMED", label: "Order confirmed", matchStatuses: ["CONFIRMED"] },
  { key: "PREPARING", label: "Preparing", matchStatuses: ["PARTIALLY_READY", "READY"] },
  { key: "OUT_FOR_DELIVERY", label: "Out for delivery", matchStatuses: ["OUT_FOR_DELIVERY"] },
  { key: "DELIVERED", label: "Delivered", matchStatuses: ["DELIVERED"] },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

interface OrderTimelineProps {
  events: OrderStatusEvent[];
  riderAssigned: boolean;
  currentStatus: string;
}

export function OrderTimeline({ events, riderAssigned, currentStatus }: OrderTimelineProps) {
  const masterEvents = events.filter((e) => e.masterStatus !== null);
  const reachedStatuses = new Set(masterEvents.map((e) => e.masterStatus));

  // Inject rider-assigned as a virtual step between READY and OUT_FOR_DELIVERY
  const allSteps: TimelineStep[] = [
    STEPS[0]!,
    STEPS[1]!,
    { key: "RIDER_ASSIGNED", label: "Rider assigned", matchStatuses: ["RIDER_ASSIGNED"] },
    STEPS[2]!,
    STEPS[3]!,
  ];

  const isDone = (step: TimelineStep) => {
    if (step.key === "RIDER_ASSIGNED") return riderAssigned;
    return step.matchStatuses.some((s) => reachedStatuses.has(s));
  };

  const getEventTime = (step: TimelineStep): string | undefined => {
    if (step.key === "RIDER_ASSIGNED") return undefined;
    for (const s of step.matchStatuses) {
      const ev = masterEvents.find((e) => e.masterStatus === s);
      if (ev) return formatTime(ev.createdAt);
    }
  };

  const isActive = (step: TimelineStep) => {
    const upper = currentStatus.toUpperCase();
    if (step.key === "RIDER_ASSIGNED")
      return riderAssigned && !reachedStatuses.has("OUT_FOR_DELIVERY");
    return step.matchStatuses.some((s) => s === upper);
  };

  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-4">Live order status</p>
      <div className="relative">
        {allSteps.map((step, idx) => {
          const done = isDone(step);
          const active = isActive(step);
          const time = getEventTime(step);
          const isLast = idx === allSteps.length - 1;

          return (
            <div key={step.key} className="flex items-start gap-3">
              {/* Dot + connector */}
              <div className="flex flex-col items-center">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5 transition-colors"
                  style={{
                    background: done || active ? "var(--rsc-main)" : "#d1d5db",
                    border: active ? "2px solid var(--rsc-main)" : "none",
                    boxShadow: active ? "0 0 0 3px rgba(var(--rsc-main-rgb,0,0,0),0.15)" : "none",
                  }}
                />
                {!isLast && (
                  <div
                    className="w-0.5 h-6 transition-colors"
                    style={{ background: done ? "var(--rsc-main)" : "#e5e7eb" }}
                  />
                )}
              </div>

              {/* Label */}
              <div className="pb-1">
                <p
                  className="text-sm leading-tight"
                  style={{
                    fontWeight: active ? 700 : done ? 500 : 400,
                    color: done || active ? "#111827" : "#9ca3af",
                  }}
                >
                  {step.label}
                </p>
                {time && <p className="text-xs text-gray-400 mt-0.5">{time}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
