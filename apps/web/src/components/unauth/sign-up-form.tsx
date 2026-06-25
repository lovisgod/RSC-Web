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

const signUpFormSchema = signUpSchema
  .extend({
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignUpFormValues = z.infer<typeof signUpFormSchema>;

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-4 text-sm placeholder:text-gray-400 focus:border-[var(--rsc-main)] focus:outline-none";

const labelClass = "block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1.5";

export function SignUpForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
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

  const fields: { name: keyof SignUpFormData; type: string; label: string; placeholder: string }[] =
    [
      { name: "fullName", type: "text", label: "Full name", placeholder: "Ada Okafor" },
      { name: "email", type: "email", label: "Email address", placeholder: "ada@example.com" },
      { name: "phone", type: "tel", label: "Phone number", placeholder: "08031234567" },
      { name: "password", type: "password", label: "Password", placeholder: "••••••••" },
    ];

  return (
    <form
      onSubmit={handleSubmit(({ confirmPassword: _omit, ...data }) => mutation.mutate(data))}
      className="w-full max-w-sm space-y-6"
    >
      <div className="flex flex-col items-center justify-center gap-1 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          <span style={{ color: "var(--rsc-main)" }}>RSC</span>{" "}
          <span style={{ color: "var(--rsc-dark)" }}>Food</span>
        </h1>
        <p className="text-sm text-gray-500">
          Create an account to discover restaurants around you.
        </p>
      </div>

      <div className="space-y-4">
        {fields.map(({ name, type, label, placeholder }) => (
          <div key={name}>
            <label className={labelClass}>{label}</label>
            <input
              {...register(name)}
              type={type}
              placeholder={placeholder}
              className={inputClass}
            />
            {errors[name] && <p className="mt-1 text-xs text-red-500">{errors[name]?.message}</p>}
          </div>
        ))}

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
        {mutation.isPending ? "Creating account…" : "Sign Up"}
      </button>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-semibold hover:underline"
          style={{ color: "var(--rsc-dark)" }}
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
