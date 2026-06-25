import { Suspense } from "react";
import type { Metadata } from "next";

import { OtpVerificationForm } from "@/src/components/unauth/otp-verification-form";

export const metadata: Metadata = { title: "Verify OTP" };

export default function OtpVerificationPage() {
  return (
    <Suspense>
      <OtpVerificationForm />
    </Suspense>
  );
}
