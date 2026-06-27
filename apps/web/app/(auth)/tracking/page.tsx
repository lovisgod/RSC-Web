import { EmptyState, PageHeader } from "@rsc/ui";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { AuthGuard } from "@/src/components/auth/auth-guard";

export const metadata: Metadata = { title: "Tracking" };

export default function TrackingPage() {
  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <PageHeader title="Tracking" subtitle="Live updates on your active order." />
        <EmptyState
          icon={
            <Image
              src="/icons/png/round-pushpin_1f4cd.png"
              alt="Tracking"
              width={48}
              height={48}
              className="object-contain"
            />
          }
          heading="No active order to track"
          body="Place an order and live delivery updates will appear here."
          action={
            <Link
              href="/menu"
              className="text-sm font-semibold hover:underline"
              style={{ color: "var(--rsc-dark)" }}
            >
              Browse kitchens
            </Link>
          }
        />
      </div>
    </AuthGuard>
  );
}
