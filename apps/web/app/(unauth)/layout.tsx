import type { ReactNode } from "react";

import { UnauthGuard } from "@/src/components/unauth/unauth-guard";

export default function UnauthLayout({ children }: { children: ReactNode }) {
  return (
    <UnauthGuard>
      <div className="flex min-h-screen flex-col bg-[var(--rsc-page-background)] md:items-center md:justify-center md:p-8">
        <div className="flex min-h-screen w-full overflow-hidden bg-[var(--rsc-shell)] md:min-h-0 md:max-w-4xl md:rounded-3xl md:shadow-sm">
          <div className="flex min-h-screen flex-1 items-center justify-center px-6 py-10 md:min-h-0 md:p-10">
            {children}
          </div>
        </div>
      </div>
    </UnauthGuard>
  );
}
