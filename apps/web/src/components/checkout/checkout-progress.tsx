import { Check } from "lucide-react";

import { CHECKOUT_STEPS } from "@/src/lib/data/checkout";

export function CheckoutProgress({ current }: { current: number }) {
  return (
    <div className="flex items-center w-full">
      {CHECKOUT_STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const isLast = i === CHECKOUT_STEPS.length - 1;

        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            {/* Step bubble + label */}
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={
                  done
                    ? { backgroundColor: "var(--rsc-dark)", color: "white" }
                    : active
                      ? {
                          backgroundColor: "var(--rsc-main)",
                          color: "white",
                          boxShadow:
                            "0 0 0 3px color-mix(in srgb, var(--rsc-main) 25%, transparent)",
                        }
                      : { backgroundColor: "#f3f4f6", color: "#9ca3af" }
                }
              >
                {done ? <Check className="w-5 h-5" strokeWidth={2.5} /> : i + 1}
              </div>
              <span
                className="text-[10px] font-semibold tracking-wide whitespace-nowrap"
                style={
                  active
                    ? { color: "var(--rsc-main)" }
                    : done
                      ? { color: "var(--rsc-dark)" }
                      : { color: "#9ca3af" }
                }
              >
                {label}
              </span>
            </div>

            {/* Connector line — not after last step */}
            {!isLast && (
              <div className="flex-1 h-0.5 mx-2 mb-5 rounded-full overflow-hidden bg-gray-200">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: done ? "100%" : "0%",
                    backgroundColor: "var(--rsc-dark)",
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
