import type { Metadata } from "next";

import { AuthGuard } from "@/src/components/auth/auth-guard";
import { PaymentReturnView } from "@/src/components/payment/payment-return-view";

export const metadata: Metadata = { title: "Payment Return" };

export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;

  return (
    <AuthGuard>
      <div className="min-h-[60vh] px-4 py-16">
        <PaymentReturnView reference={reference ?? null} />
      </div>
    </AuthGuard>
  );
}
