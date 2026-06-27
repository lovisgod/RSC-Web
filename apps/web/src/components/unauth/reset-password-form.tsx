"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { Button } from "@rsc/ui";

import { resetPasswordSchema, type ResetPasswordFormData } from "@/src/lib/schemas/auth";
import { inputClass, labelClass } from "@/src/lib/form-styles";

export function ResetPasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({ resolver: zodResolver(resetPasswordSchema) });

  const mutation = useMutation({
    mutationFn: async (_data: ResetPasswordFormData) => {
      // TODO: replace with apiClient.resetPassword(_data)
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
        <p className="text-sm text-gray-500">Choose a new password for your account.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className={labelClass}>New password</label>
          <input
            {...register("password")}
            type="password"
            placeholder="••••••••"
            className={inputClass}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>Confirm password</label>
          <input
            {...register("confirmPassword")}
            type="password"
            placeholder="••••••••"
            className={inputClass}
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

      <Button
        tone="navy"
        fullWidth
        type="submit"
        disabled={mutation.isPending || mutation.isSuccess}
      >
        {mutation.isPending ? "Updating…" : "Update password"}
      </Button>

      <p className="text-center text-sm text-gray-400">Password must be at least 8 characters</p>
    </form>
  );
}
