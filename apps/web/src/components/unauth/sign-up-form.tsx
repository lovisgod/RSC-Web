"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ApiError } from "@rsc/api-client";

import { signUpSchema, type SignUpFormData } from "@/src/lib/schemas/auth";
import { apiClient } from "@/src/lib/api";

const signUpFormSchema = signUpSchema.extend({
  confirmPassword: z.string(),
});

type SignUpFormValues = z.infer<typeof signUpFormSchema>;

export function SignUpForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpFormSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: SignUpFormData) =>
      apiClient.registerCustomer({
        name: data.fullName,
        phone: data.phone,
        email: data.email,
        password: data.password,
      }),
    onSuccess: (_, variables) =>
      router.push(`/otp-verification?phone=${encodeURIComponent(variables.phone)}`),
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) return;
    },
  });

  const fields = [
    { name: "fullName" as const, type: "text", placeholder: "Full name" },
    { name: "phone" as const, type: "tel", placeholder: "Phone number" },
    { name: "email" as const, type: "email", placeholder: "Email address" },
    { name: "password" as const, type: "password", placeholder: "Password" },
  ];

  return (
    <form
      onSubmit={handleSubmit(({ confirmPassword: _omit, ...data }) => mutation.mutate(data))}
      className="w-full max-w-sm space-y-4"
    >
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">Create Account</h1>
        <p className="mt-2 text-sm text-gray-400">
          Create an account to discover restaurants around you.
        </p>
      </div>

      <div className="space-y-3">
        {fields.map(({ name, type, placeholder }) => (
          <div key={name}>
            <input
              {...register(name)}
              type={type}
              placeholder={placeholder}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-4 text-sm placeholder:text-gray-400 focus:border-[var(--rsc-main)] focus:outline-none"
            />
            {errors[name] && <p className="mt-1 text-xs text-red-500">{errors[name]?.message}</p>}
          </div>
        ))}

        <div>
          <input
            {...register("confirmPassword", {
              required: "Please confirm your password",
              validate: (val) => val === getValues("password") || "Passwords do not match",
            })}
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
          {mutation.error instanceof ApiError && mutation.error.status === 409
            ? "An account with this phone or email already exists."
            : mutation.error instanceof ApiError && mutation.error.status === 502
              ? "We couldn't send the OTP. Please try again."
              : "Something went wrong. Please try again."}
        </p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full rounded-full py-4 text-sm font-semibold text-white transition-opacity disabled:opacity-70"
        style={{ backgroundColor: "var(--rsc-main)" }}
      >
        {mutation.isPending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/sign-in" className="hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
