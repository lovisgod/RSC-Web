import type { Metadata } from "next";

import { SignUpForm } from "@/src/components/unauth/sign-up-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return <SignUpForm />;
}
