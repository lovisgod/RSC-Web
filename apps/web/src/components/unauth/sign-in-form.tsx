"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@rsc/ui";

import { signInSchema, type SignInFormData } from "@/src/lib/schemas/auth";
import { useAuthStore } from "@/src/stores/auth-store";
import { getMutationErrorMessage } from "@/src/lib/api-error";
import { apiClient } from "@/src/lib/api";
import { inputClass, labelClass } from "@/src/lib/form-styles";
import { PasswordInput } from "@/src/components/shared/password-input";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signIn = useAuthStore((s) => s.signIn);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({ resolver: zodResolver(signInSchema) });

  const mutation = useMutation({
    mutationFn: (data: SignInFormData) =>
      apiClient.login({ identifier: data.identifier, password: data.password }),
    onSuccess: () => {
      signIn();
      const redirect = searchParams.get("redirect") ?? "/outlets";
      router.push(redirect);
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
        <p className="text-sm text-gray-500">Welcome back! Log in to order delicious meals.</p>
      </div>

      <div className="space-y-4">
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

        <div>
          <label className={labelClass}>Password</label>
          <PasswordInput {...register("password")} placeholder="••••••••" />
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>
      </div>

      {mutation.isError && (
        <p className="text-center text-sm text-red-500">
          {getMutationErrorMessage(mutation.error, {
            401: "Incorrect email/phone or password.",
          })}
        </p>
      )}

      <Button tone="navy" fullWidth type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Logging in…" : "Log In"}
      </Button>

      <p className="text-center text-sm text-gray-500">
        <Link href="/forgot-password" className="hover:underline">
          Forgot password?
        </Link>{" "}
        <Link
          href="/sign-up"
          className="font-semibold hover:underline"
          style={{ color: "var(--rsc-dark)" }}
        >
          Register
        </Link>
      </p>
    </form>
  );
}
