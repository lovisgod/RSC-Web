import type { Metadata } from "next";

import { AuthGuard } from "@/src/components/auth/auth-guard";
import { OutletDetailView } from "@/src/components/outlet-detail/outlet-detail-view";

export const metadata: Metadata = { title: "Kitchen menu" };

export default async function OutletPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AuthGuard>
      <OutletDetailView id={id} />
    </AuthGuard>
  );
}
