import { PageHeader } from "@rsc/ui";
import type { Metadata } from "next";

import { AuthGuard } from "@/src/components/auth/auth-guard";
import { NotificationsView } from "@/src/components/notifications/notifications-view";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <PageHeader
          title="Notifications"
          subtitle="Real-time order updates, kitchen specials & exclusive vouchers."
        />
        <NotificationsView />
      </div>
    </AuthGuard>
  );
}
