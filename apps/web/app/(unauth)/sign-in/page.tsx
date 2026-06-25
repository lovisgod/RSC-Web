import type { Metadata } from "next";

import { SignInForm } from "@/src/components/unauth/sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return <SignInForm />;
}
