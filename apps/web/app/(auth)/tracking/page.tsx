import { PageHeader } from "@rsc/ui";
import type { Metadata } from "next";

import { AuthGuard } from "@/src/components/auth/auth-guard";
import { TrackingView } from "@/src/components/tracking/tracking-view";

export const metadata: Metadata = { title: "Tracking" };

export default async function TrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; reference?: string }>;
}) {
  const { orderId, reference } = await searchParams;

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <PageHeader title="Tracking" subtitle="Live updates on your active order." />
        <TrackingView orderId={orderId ?? null} paymentReference={reference ?? null} />
      </div>
    </AuthGuard>
  );
}
