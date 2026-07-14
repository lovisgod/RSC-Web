"use client";

import type { OrderStatusEvent } from "@rsc/contracts";

interface TimelineStep {
  key: string;
  label: string;
  matchStatuses: string[];
}

const PREPARATION_STEPS: TimelineStep[] = [
  {
    key: "CONFIRMED",
    label: "Order confirmed",
    matchStatuses: ["CONFIRMED"],
  },
  {
    key: "PREPARING",
    label: "Kitchens preparing",
    matchStatuses: ["PREPARING", "PARTIALLY_READY", "PARTIALLY_FULFILLED"],
  },
  { key: "READY", label: "Order ready", matchStatuses: ["READY"] },
];

const DELIVERY_STEPS: TimelineStep[] = [
  ...PREPARATION_STEPS,
  {
    key: "RIDER_ASSIGNED",
    label: "Rider assigned",
    matchStatuses: ["RIDER_ASSIGNED"],
  },
  {
    key: "OUT_FOR_DELIVERY",
    label: "Out for delivery",
    matchStatuses: ["OUT_FOR_DELIVERY"],
  },
  { key: "DELIVERED", label: "Delivered", matchStatuses: ["DELIVERED"] },
];

const TAKEOUT_STEPS: TimelineStep[] = [
  ...PREPARATION_STEPS,
  { key: "DELIVERED", label: "Picked up", matchStatuses: ["DELIVERED"] },
];

const STATUS_ORDER = [
  "CONFIRMED",
  "PREPARING",
  "PARTIALLY_READY",
  "PARTIALLY_FULFILLED",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface OrderTimelineProps {
  events: OrderStatusEvent[];
  riderAssigned: boolean;
  currentStatus: string;
  deliveryMode: "DELIVERY" | "TAKEOUT";
}

export function OrderTimeline({
  events,
  riderAssigned,
  currentStatus,
  deliveryMode,
}: OrderTimelineProps) {
  const masterEvents = events.filter((event) => event.masterStatus !== null);
  const currentIndex = STATUS_ORDER.indexOf(currentStatus.toUpperCase());
  const steps = deliveryMode === "TAKEOUT" ? TAKEOUT_STEPS : DELIVERY_STEPS;

  const isDone = (step: TimelineStep) => {
    if (step.key === "RIDER_ASSIGNED") return riderAssigned;
    const stepIndex = STATUS_ORDER.indexOf(step.key);
    return stepIndex !== -1 && currentIndex >= stepIndex;
  };

  const getEventTime = (step: TimelineStep) => {
    if (step.key === "RIDER_ASSIGNED") return undefined;
    const event = masterEvents.find((item) => step.matchStatuses.includes(item.masterStatus ?? ""));
    return event ? formatTime(event.createdAt) : undefined;
  };

  const isActive = (step: TimelineStep) => {
    if (step.key === "RIDER_ASSIGNED") {
      return riderAssigned && currentStatus.toUpperCase() === "READY";
    }
    return step.matchStatuses.includes(currentStatus.toUpperCase());
  };

  return (
    <div>
      <p className="mb-4 text-sm font-semibold text-gray-700">Live order status</p>
      <div>
        {steps.map((step, index) => {
          const done = isDone(step);
          const active = isActive(step);
          const time = getEventTime(step);

          return (
            <div key={step.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <span
                  className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
                  style={{
                    background: done ? "var(--rsc-main)" : "#d1d5db",
                    boxShadow: active
                      ? "0 0 0 3px color-mix(in srgb, var(--rsc-main) 20%, transparent)"
                      : "none",
                  }}
                />
                {index < steps.length - 1 && (
                  <span
                    className="h-7 w-0.5"
                    style={{
                      background: done ? "var(--rsc-main)" : "#e5e7eb",
                    }}
                  />
                )}
              </div>
              <div className="pb-2">
                <p
                  className="text-sm leading-tight"
                  style={{
                    color: done ? "#111827" : "#9ca3af",
                    fontWeight: active ? 700 : done ? 500 : 400,
                  }}
                >
                  {step.label}
                </p>
                {time && <p className="mt-0.5 text-xs text-gray-400">{time}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
