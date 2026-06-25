import type { Metadata } from "next";

import { ResetPasswordForm } from "@/src/components/unauth/reset-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
