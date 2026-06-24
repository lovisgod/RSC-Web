import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/src/components/unauth/forgot-password-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
