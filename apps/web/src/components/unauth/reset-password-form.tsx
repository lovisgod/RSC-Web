"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { NIGERIAN_MOBILE_NUMBER_PATTERN } from "@rsc/contracts";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@rsc/ui";

import { resetPasswordSchema, type ResetPasswordFormData } from "@/src/lib/schemas/auth";
import { apiClient } from "@/src/lib/api";
import { getMutationErrorMessage } from "@/src/lib/api-error";
import { inputClass, labelClass } from "@/src/lib/form-styles";
import { PasswordInput } from "@/src/components/shared/password-input";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const identifier = searchParams.get("identifier") ?? "";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({ resolver: zodResolver(resetPasswordSchema) });

  const mutation = useMutation({
    mutationFn: (data: ResetPasswordFormData) => {
      const isPhone = NIGERIAN_MOBILE_NUMBER_PATTERN.test(identifier);
      return apiClient.resetPassword({
        identifier,
        ...(isPhone ? { phoneCode: data.code } : { emailCode: data.code }),
        newPassword: data.password,
      });
    },
    onSuccess: () => {
      toast.success("Password updated! You can now sign in.");
      router.replace("/sign-in");
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
          Enter the reset code sent to you and your new password.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className={labelClass}>Reset code</label>
          <input
            {...register("code")}
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit code"
            className={inputClass}
          />
          {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code.message}</p>}
        </div>

        <div>
          <label className={labelClass}>New password</label>
          <PasswordInput {...register("password")} placeholder="••••••••" />
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>Confirm password</label>
          <PasswordInput {...register("confirmPassword")} placeholder="••••••••" />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>
      </div>

      {mutation.isError && (
        <p className="text-center text-sm text-red-500">
          {getMutationErrorMessage(mutation.error, {
            400: "The reset code is invalid or has expired.",
            404: "No account found for this identifier.",
          })}
        </p>
      )}

      <Button tone="navy" fullWidth type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Updating…" : "Update password"}
      </Button>

      <p className="text-center text-sm text-gray-400">Password must be at least 8 characters</p>
    </form>
  );
}
