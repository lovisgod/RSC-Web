import type { ReactNode } from "react";

// import { AuthBreadcrumb } from "@/src/components/unauth/auth-breadcrumb";
import { AuthCarousel } from "@/src/components/unauth/auth-carousel";

export default function UnauthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f0ede8] p-4 md:p-8 flex flex-col">
      {/* <AuthBreadcrumb /> */}

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden flex shadow-sm min-h-[640px]">
          {/* ── Left panel ── */}
          <div
            className="hidden md:flex w-[42%] flex-col p-8"
            style={{ backgroundColor: "var(--rsc-main)" }}
          >
            {/* Brand */}
            <div className="flex items-center gap-2 mb-6">
              {/* <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: "var(--rsc-accent)" }}
              /> */}
              {/* <h1 className="text-[var(--rsc-danger)] font-bold text-base">
                <span>RSC</span> Foods
              </h1> */}
            </div>

            {/* Hero carousel */}
            <AuthCarousel />

            {/* Copy */}
            <div className="mt-8 pt-4">
              <h2 className="text-white text-3xl font-bold leading-tight tracking-tight mb-3">
                One <span className="text-[var(--rsc-dark)] "> RSC</span> cart for every craving.
              </h2>
              <p className="text-white/60 text-sm leading-relaxed">
                Fast reorders and live split-kitchen tracking.
              </p>
            </div>
          </div>

          {/* ── Right panel — form injected here ── */}
          <div className="flex-1 flex items-center justify-center p-8 md:p-12">{children}</div>
        </div>
      </div>
    </div>
  );
}
