// apps/web/src/app/verify/page.tsx
"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input } from "@rsc/ui";
import { VerifyPhoneInputSchema, type VerifyPhoneInput } from "@rsc/contracts";

// 🔐 Privacy Masking Utility
const maskPhoneNumber = (phone: string) => {
  if (!phone) return "your phone number";
  if (phone.length < 5) return phone;

  const firstTwo = phone.slice(0, 2);
  const lastTwo = phone.slice(-2);
  const stars = "*".repeat(phone.length - 4);

  return `${firstTwo}${stars}${lastTwo}`;
};

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetPhone = searchParams.get("phone") || "";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyPhoneInput>({
    resolver: zodResolver(VerifyPhoneInputSchema),
    defaultValues: {
      phoneNumber: targetPhone,
      otpCode: "",
    },
  });

  const onSubmit = async (data: VerifyPhoneInput) => {
    try {
      console.log("Submitting Termii OTP payload:", data);
      const mockApiResponse = { success: true };

      if (mockApiResponse.success) {
        router.push("/signIn");
      }
    } catch (error) {
      console.error("Verification error:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Hidden layout field to satisfy our data contract */}
      <input type="hidden" {...register("phoneNumber")} value={targetPhone} />

      {/* Embedded Clean Instruction Subtext instead of a bordered box */}
      <p className="text-center text-rsc-muted text-sm -mt-2">
        Enter the 6-digit confirmation code sent to{" "}
        <span className="text-rsc-ink font-bold tracking-wide">{maskPhoneNumber(targetPhone)}</span>{" "}
        via SMS.
      </p>

      <Input
        label="6-Digit Verification Code"
        type="text"
        placeholder="123456"
        maxLength={6}
        className="text-center font-mono text-xl tracking-[0.5em] placeholder:tracking-normal placeholder:font-sans"
        error={errors.otpCode?.message}
        {...register("otpCode")}
      />

      <Button type="submit" tone="auth" className="w-full mt-2">
        Verify Account
      </Button>
    </form>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md bg-rsc-panel rounded-rsc shadow-rsc p-8 border border-rsc-line">
        {/* Simplified Header */}
        <div className="text-center mb-4">
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="text-rsc-brand">RSC</span>{" "}
            <span className="text-rsc-accent-deep">Food</span>
          </h1>
        </div>

        <Suspense
          fallback={
            <div className="text-center text-sm text-rsc-muted">Loading verification layout...</div>
          }
        >
          <VerifyForm />
        </Suspense>
      </div>
    </div>
  );
}
