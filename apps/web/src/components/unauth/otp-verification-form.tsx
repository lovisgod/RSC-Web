"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { ApiError } from "@rsc/api-client";

import { otpSchema, type OtpFormData } from "@/src/lib/schemas/auth";
import { apiClient } from "@/src/lib/api";

const OTP_RESEND_SECONDS = 60;

export function OtpVerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") ?? "";

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
    mutationFn: (data: OtpFormData) => apiClient.verifyPhone({ phone, code: data.code }),
    onSuccess: () => router.push("/sign-in"),
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      // TODO: wire up resend OTP endpoint when available
      await new Promise((r) => setTimeout(r, 500));
      setSeconds(OTP_RESEND_SECONDS);
    },
  });

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <form
      onSubmit={handleSubmit((data) => mutation.mutate(data))}
      className="w-full max-w-sm space-y-4"
    >
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">Verify OTP</h1>
        <p className="mt-2 text-sm text-gray-400">
          Enter the 6-digit OTP
          {/* {phone && <span className="font-medium text-gray-600"> {phone}</span>} */}
        </p>
      </div>

      <div>
        <input
          {...register("code")}
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="OTP code 4 8 2 9 1 6"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-4 text-sm tracking-widest placeholder:text-gray-400 focus:border-[var(--rsc-main)] focus:outline-none"
        />
        {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code.message}</p>}
      </div>

      {mutation.isError && (
        <p className="text-center text-sm text-red-500">
          {mutation.error instanceof ApiError && mutation.error.status === 401
            ? "Code is incorrect, expired, or already used."
            : "Something went wrong. Please try again."}
        </p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending || !phone}
        className="w-full rounded-full py-4 text-sm font-semibold text-white transition-opacity disabled:opacity-70"
        style={{ backgroundColor: "var(--rsc-main)" }}
      >
        {mutation.isPending ? "Verifying…" : "Verify Account"}
      </button>

      <p className="text-center text-sm text-gray-500">
        {seconds > 0 ? (
          <>
            Resend code in <span className="font-medium">00:{pad(seconds)}</span>
          </>
        ) : (
          <button
            type="button"
            onClick={() => resendMutation.mutate()}
            disabled={resendMutation.isPending}
            className="font-medium hover:underline disabled:opacity-50"
            style={{ color: "var(--rsc-main)" }}
          >
            {resendMutation.isPending ? "Sending…" : "Resend code"}
          </button>
        )}
      </p>
    </form>
  );
}
