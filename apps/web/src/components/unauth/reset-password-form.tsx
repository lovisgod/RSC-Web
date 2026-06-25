"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { resetPasswordSchema, type ResetPasswordFormData } from "@/src/lib/schemas/auth";

export function ResetPasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({ resolver: zodResolver(resetPasswordSchema) });

  const mutation = useMutation({
    mutationFn: async (_data: ResetPasswordFormData) => {
      // TODO: replace with apiClient.auth.resetPassword(_data)
      await new Promise((r) => setTimeout(r, 1000));
    },
  });

  return (
    <form
      onSubmit={handleSubmit((data) => mutation.mutate(data))}
      className="w-full max-w-sm space-y-4"
    >
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">Reset Password</h1>
        <p className="mt-2 text-sm text-gray-400">
          Secure account flow with inline validation and OTP-ready protection.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <input
            {...register("password")}
            type="password"
            placeholder="New password"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-4 text-sm placeholder:text-gray-400 focus:border-[var(--rsc-main)] focus:outline-none"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <div>
          <input
            {...register("confirmPassword")}
            type="password"
            placeholder="Confirm password"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-4 text-sm placeholder:text-gray-400 focus:border-[var(--rsc-main)] focus:outline-none"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>
      </div>

      {mutation.isError && (
        <p className="text-center text-sm text-red-500">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Something went wrong. Please try again."}
        </p>
      )}

      {mutation.isSuccess && (
        <p className="text-center text-sm text-green-600">Password updated! You can now sign in.</p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending || mutation.isSuccess}
        className="w-full rounded-full py-4 text-sm font-semibold text-white transition-opacity disabled:opacity-70"
        style={{ backgroundColor: "var(--rsc-main)" }}
      >
        {mutation.isPending ? "Updating…" : "Update password"}
      </button>

      <p className="text-center text-sm text-gray-400">Password must be at least 8 characters</p>
    </form>
  );
}
