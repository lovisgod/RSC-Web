"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@rsc/ui";

import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/src/lib/schemas/auth";
import { apiClient } from "@/src/lib/api";
import { getMutationErrorMessage } from "@/src/lib/api-error";
import { inputClass, labelClass } from "@/src/lib/form-styles";

export function ForgotPasswordForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({ resolver: zodResolver(forgotPasswordSchema) });

  const mutation = useMutation({
    mutationFn: (data: ForgotPasswordFormData) =>
      apiClient.forgotPassword({ identifier: data.identifier }),
    onSuccess: (_, variables) => {
      router.push(`/reset-password?identifier=${encodeURIComponent(variables.identifier)}`);
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
          <span style={{ color: "var(--rsc-brand)" }}>Food</span>
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
          {getMutationErrorMessage(mutation.error)}
        </p>
      )}

      <Button tone="navy" fullWidth type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Sending…" : "Send reset code"}
      </Button>

      <p className="text-center text-sm text-gray-500">
        <Link
          href="/sign-in"
          className="font-semibold hover:underline"
          style={{ color: "var(--rsc-brand)" }}
        >
          Return to sign in
        </Link>
      </p>
    </form>
  );
}
