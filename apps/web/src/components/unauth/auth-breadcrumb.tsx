"use client";

import { usePathname } from "next/navigation";

const labels: Record<string, string> = {
  "/sign-in": "Sign In",
  "/sign-up": "Sign Up",
  "/otp-verification": "OTP Verification",
  "/forgot-password": "Forgot Password",
  "/reset-password": "Reset Password",
};

export function AuthBreadcrumb() {
  const pathname = usePathname();
  const page = labels[pathname] ?? "Auth";

  return (
    <nav className="flex items-center justify-between px-1 mb-4 text-sm">
      <span style={{ color: "var(--rsc-main)" }}>
        Auth / <span className="font-medium">{page}</span>
      </span>
      <span className="text-gray-400">Customer account access</span>
    </nav>
  );
}
