"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@rsc/ui";

import { otpSchema, type OtpFormData } from "@/src/lib/schemas/auth";
import { apiClient } from "@/src/lib/api";
import { getMutationErrorMessage } from "@/src/lib/api-error";
import { labelClass } from "@/src/lib/form-styles";

const OTP_RESEND_SECONDS = 600;

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-4 text-sm tracking-widest placeholder:text-gray-400 focus:border-[var(--rsc-main)] focus:outline-none";

export function OtpVerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [seconds, setSeconds] = useState(OTP_RESEND_SECONDS);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OtpFormData>({ resolver: zodResolver(otpSchema) });

  const mutation = useMutation({
    mutationFn: (data: OtpFormData) =>
      apiClient.verifyUser({ channel: "email", email, code: data.code }),
    onSuccess: () => router.push("/sign-in"),
  });

  const resendMutation = useMutation({
    mutationFn: () => apiClient.resendVerificationCode({ channel: "email", email }),
    onSuccess: (data) => setSeconds(data.otpExpiresInSeconds),
  });

  const formatCountdown = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  // if (!email) {
  //   return (
  //     <div className="w-full max-w-sm space-y-4 text-center">
  //       <p className="text-2xl">⚠️</p>
  //       <p className="font-semibold text-gray-700">Session expired</p>
  //       <p className="text-sm text-gray-400">
  //         We couldn&apos;t find your email. Please go back and sign up again.
  //       </p>
  //       <a
  //         href="/sign-up"
  //         className="inline-block mt-2 text-sm font-semibold hover:underline"
  //         style={{ color: "var(--rsc-dark)" }}
  //       >
  //         Back to sign up
  //       </a>
  //     </div>
  //   );
  // }

  return (
    <form
      onSubmit={handleSubmit((data) => mutation.mutate(data))}
      className="w-full max-w-sm space-y-6"
    >
      <div className="flex flex-col items-center justify-center gap-1 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          <span style={{ color: "var(--rsc-main)" }}>RSC</span>{" "}
          <span style={{ color: "var(--rsc-dark)" }}>Food</span>
        </h1>
        <p className="text-sm text-gray-500">
          Enter the 6-digit OTP sent to <span className="font-medium text-gray-700">{email}</span>.
        </p>
      </div>

      <div>
        <label className={labelClass}>OTP code</label>
        <input
          {...register("code")}
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="• • • • • •"
          className={inputClass}
        />
        {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code.message}</p>}
      </div>

      {mutation.isError && (
        <p className="text-center text-sm text-red-500">
          {getMutationErrorMessage(mutation.error, {
            401: "Code is incorrect, expired, or already used.",
          })}
        </p>
      )}

      <Button tone="navy" fullWidth type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Verifying…" : "Verify Account"}
      </Button>

      <p className="text-center text-sm text-gray-500">
        {seconds > 0 ? (
          <>
            Resend code in <span className="font-medium">{formatCountdown(seconds)}</span>
          </>
        ) : (
          <button
            type="button"
            onClick={() => resendMutation.mutate()}
            disabled={resendMutation.isPending}
            className="font-semibold hover:underline disabled:opacity-50"
            style={{ color: "var(--rsc-dark)" }}
          >
            {resendMutation.isPending ? "Sending…" : "Resend code"}
          </button>
        )}
      </p>
    </form>
  );
}
