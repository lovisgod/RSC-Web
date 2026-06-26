"use client";

import { Button } from "@rsc/ui";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/src/stores/auth-store";

export function CheckoutButton() {
  const router = useRouter();
  const isSignedIn = useAuthStore((s) => s.isSignedIn);

  function handleClick() {
    router.push(isSignedIn ? "/checkout" : "/sign-in?redirect=/checkout");
  }

  return (
    <Button tone="primary" fullWidth type="button" onClick={handleClick}>
      Proceed to checkout
    </Button>
  );
}
