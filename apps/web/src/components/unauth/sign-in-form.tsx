"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useForm } from "react-hook-form";

import { signInSchema, type SignInFormData } from "@/src/lib/schemas/auth";

export function SignInForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({ resolver: zodResolver(signInSchema) });

  const mutation = useMutation({
    mutationFn: async (_data: SignInFormData) => {
      // TODO: replace with apiClient.auth.signIn(_data)
      await new Promise((r) => setTimeout(r, 1000));
    },
  });

  return (
    <form
      onSubmit={handleSubmit((data) => mutation.mutate(data))}
      className="w-full max-w-sm space-y-4"
    >
      <div className="flex flex-col items-center justify-center gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          <span className="text-[var(--rsc-dark)]">RSC</span> Food
        </h1>
        <p className="mt-2 text-sm text-gray-600">Welcome back! Log in to order delicious meals.</p>
      </div>

      <div className="space-y-8">
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

        <div>
          <input
            {...register("password")}
            type="password"
            placeholder="Password"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-4 text-sm placeholder:text-gray-400 focus:border-[var(--rsc-main)] focus:outline-none"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
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

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full rounded-full py-4 text-sm font-semibold text-white transition-opacity disabled:opacity-70"
        style={{ backgroundColor: "var(--rsc-main)" }}
      >
        {mutation.isPending ? "Logging in…" : "Log In"}
      </button>

      <p className="text-center text-sm text-gray-500">
        <Link href="/forgot-password" className="hover:underline">
          Forgot password?
        </Link>{" "}
        <Link href="/sign-up" className="hover:underline text-[var(--rsc-dark)] font-semibold">
          Register
        </Link>
      </p>
    </form>
  );
}
