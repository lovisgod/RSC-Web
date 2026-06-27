import type { Metadata } from "next";

import { ProfileView } from "@/src/components/profile/profile-view";
import { AuthGuard } from "@/src/components/auth/auth-guard";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <ProfileView />
      </div>
    </AuthGuard>
  );
}
