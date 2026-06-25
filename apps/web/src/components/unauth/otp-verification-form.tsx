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

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-4 text-sm tracking-widest placeholder:text-gray-400 focus:border-[var(--rsc-main)] focus:outline-none";

const labelClass = "block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1.5";

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
    mutationFn: (data: OtpFormData) =>
      apiClient.verifyUser({ channel: "phone", phone, code: data.code }),
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
      className="w-full max-w-sm space-y-6"
    >
      <div className="flex flex-col items-center justify-center gap-1 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          <span style={{ color: "var(--rsc-main)" }}>RSC</span>{" "}
          <span style={{ color: "var(--rsc-dark)" }}>Food</span>
        </h1>
        <p className="text-sm text-gray-500">Enter the 6-digit OTP sent to your phone.</p>
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
