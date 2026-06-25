"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useForm } from "react-hook-form";

import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/src/lib/schemas/auth";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-4 text-sm placeholder:text-gray-400 focus:border-[var(--rsc-main)] focus:outline-none";

const labelClass = "block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1.5";

export function ForgotPasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({ resolver: zodResolver(forgotPasswordSchema) });

  const mutation = useMutation({
    mutationFn: async (_data: ForgotPasswordFormData) => {
      // TODO: replace with apiClient.auth.forgotPassword(_data)
      await new Promise((r) => setTimeout(r, 1000));
    },
  });

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
          Enter your phone or email and we&apos;ll send a reset code.
        </p>
      </div>

      <div>
        <label className={labelClass}>Email or phone number</label>
        <input
          {...register("identifier")}
          type="text"
          placeholder="you@example.com or 0803…"
          className={inputClass}
        />
        {errors.identifier && (
          <p className="mt-1 text-xs text-red-500">{errors.identifier.message}</p>
        )}
      </div>

      {mutation.isError && (
        <p className="text-center text-sm text-red-500">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Something went wrong. Please try again."}
        </p>
      )}

      {mutation.isSuccess && (
        <p className="text-center text-sm text-green-600">
          Reset code sent! Check your email or phone.
        </p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending || mutation.isSuccess}
        className="w-full rounded-full py-4 text-sm font-semibold text-white transition-opacity disabled:opacity-70"
        style={{ backgroundColor: "var(--rsc-main)" }}
      >
        {mutation.isPending ? "Sending…" : "Send reset code"}
      </button>

      <p className="text-center text-sm text-gray-500">
        <Link
          href="/sign-in"
          className="font-semibold hover:underline"
          style={{ color: "var(--rsc-dark)" }}
        >
          Return to sign in
        </Link>
      </p>
    </form>
  );
}
