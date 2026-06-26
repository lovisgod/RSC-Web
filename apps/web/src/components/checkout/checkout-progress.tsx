import { CHECKOUT_STEPS } from "@/src/lib/data/checkout";

export function CheckoutProgress({ current }: { current: number }) {
  return (
    <div className="flex gap-2 sm:gap-3 mb-0 overflow-x-auto pb-1">
      {CHECKOUT_STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const filled = done || active;

        return (
          <div
            key={label}
            className="flex-1 py-2 px-1 rounded-full text-xs font-semibold text-center truncate"
            style={
              filled
                ? { backgroundColor: "var(--rsc-main)", color: "white" }
                : { border: "1.5px solid #e5e7eb", color: "#9ca3af", background: "white" }
            }
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}
