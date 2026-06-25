import type { ReactNode } from "react";

import { AuthCarousel } from "@/src/components/unauth/auth-carousel";

export default function UnauthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white md:bg-[#f0ede8] md:p-8 flex flex-col">
      <div className="flex-1 flex items-center md:justify-center">
        <div className="w-full md:max-w-4xl bg-white md:rounded-3xl overflow-hidden flex md:shadow-sm min-h-screen md:min-h-[640px]">
          {/* ── Left panel (desktop only) ── */}
          <div
            className="hidden md:flex w-[42%] flex-col p-8"
            style={{ backgroundColor: "var(--rsc-main)" }}
          >
            <div className="flex items-center gap-2 mb-6" />

            <AuthCarousel />

            <div className="mt-auto pt-8">
              <h2 className="text-white text-3xl font-bold leading-tight tracking-tight mb-3">
                One <span style={{ color: "var(--rsc-dark)" }}>RSC</span> cart for every craving.
              </h2>
              <p className="text-white/60 text-sm leading-relaxed">
                Access saved addresses, fast reorders, delivery codes, and live split-kitchen
                tracking.
              </p>
            </div>
          </div>

          {/* ── Right panel — form injected here ── */}
          <div className="flex-1 flex items-start md:items-center justify-center px-6 pt-16 pb-10 md:p-12">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
