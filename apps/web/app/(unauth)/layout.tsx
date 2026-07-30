import type { ReactNode } from "react";

import { AuthCarousel } from "@/src/components/unauth/auth-carousel";
import { UnauthGuard } from "@/src/components/unauth/unauth-guard";

export default function UnauthLayout({ children }: { children: ReactNode }) {
  return (
    <UnauthGuard>
      <div className="flex min-h-screen flex-col bg-[var(--rsc-page-background)] md:items-center md:justify-center md:p-8">
        <div className="flex min-h-screen w-full overflow-hidden bg-[var(--rsc-shell)] md:min-h-0 md:max-w-4xl md:rounded-3xl md:shadow-sm">
          {/* ── Left panel (desktop only) ── */}
          <div
            className="hidden md:flex w-[42%] flex-col p-6"
            style={{ backgroundColor: "var(--rsc-auth-aside)" }}
          >
            <AuthCarousel />

            <div className="pt-5">
              <h2
                className="mb-2 text-2xl font-bold leading-tight tracking-tight"
                style={{ color: "var(--rsc-auth-aside-ink)" }}
              >
                One <span style={{ color: "var(--rsc-brand)" }}>RSC</span> cart for every craving.
              </h2>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--rsc-auth-aside-muted)" }}
              >
                Access saved addresses, fast reorders, delivery codes, and live split-kitchen
                tracking.
              </p>
            </div>
          </div>

          {/* ── Right panel — form injected here ── */}
          <div className="flex min-h-screen flex-1 items-center justify-center px-6 py-10 md:min-h-0 md:p-10">
            {children}
          </div>
        </div>
      </div>
    </UnauthGuard>
  );
}
