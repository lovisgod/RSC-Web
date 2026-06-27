import type { ReactNode } from "react";

import { AuthCarousel } from "@/src/components/unauth/auth-carousel";
import { UnauthGuard } from "@/src/components/unauth/unauth-guard";

export default function UnauthLayout({ children }: { children: ReactNode }) {
  return (
    <UnauthGuard>
      <div className="min-h-screen bg-white md:bg-[#f0ede8] md:p-8 flex flex-col md:items-center md:justify-center">
        <div className="w-full md:max-w-4xl bg-white md:rounded-3xl overflow-hidden flex md:shadow-sm">
          {/* ── Left panel (desktop only) ── */}
          <div
            className="hidden md:flex w-[42%] flex-col p-6"
            style={{ backgroundColor: "var(--rsc-main)" }}
          >
            <AuthCarousel />

            <div className="pt-5">
              <h2 className="text-white text-2xl font-bold leading-tight tracking-tight mb-2">
                One <span style={{ color: "var(--rsc-dark)" }}>RSC</span> cart for every craving.
              </h2>
              <p className="text-white/60 text-sm leading-relaxed">
                Access saved addresses, fast reorders, delivery codes, and live split-kitchen
                tracking.
              </p>
            </div>
          </div>

          {/* ── Right panel — form injected here ── */}
          <div className="flex-1 flex items-center justify-center px-6 py-10 md:p-10">
            {children}
          </div>
        </div>
      </div>
    </UnauthGuard>
  );
}
