"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useForm } from "react-hook-form";

import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/src/lib/schemas/auth";

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
      className="w-full max-w-sm space-y-4"
    >
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">Forgot Password</h1>
        <p className="mt-2 text-sm text-gray-400">
          Secure account flow with inline validation and OTP-ready protection.
        </p>
      </div>

      <div>
        <input
          {...register("identifier")}
          type="text"
          placeholder="Email or phone number"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-4 text-sm placeholder:text-gray-400 focus:border-[var(--rsc-main)] focus:outline-none"
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
        <Link href="/sign-in" className="hover:underline">
          Return to sign in
        </Link>
      </p>
    </form>
  );
}
