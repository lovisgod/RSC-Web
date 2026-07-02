"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@rsc/ui";

import { signUpSchema, type SignUpFormData } from "@/src/lib/schemas/auth";
import { apiClient } from "@/src/lib/api";
import { getMutationErrorMessage } from "@/src/lib/api-error";
import { inputClass, labelClass } from "@/src/lib/form-styles";
import { PasswordInput } from "@/src/components/shared/password-input";

const signUpFormSchema = signUpSchema
  .extend({
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignUpFormValues = z.infer<typeof signUpFormSchema>;

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
      router.push(`/otp-verification?email=${encodeURIComponent(variables.email)}`),
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
      onSubmit={handleSubmit((values) =>
        mutation.mutate({
          fullName: values.fullName,
          phone: values.phone,
          email: values.email,
          password: values.password,
        }),
      )}
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
            {type === "password" ? (
              <PasswordInput {...register(name)} placeholder={placeholder} />
            ) : (
              <input
                {...register(name)}
                type={type}
                placeholder={placeholder}
                className={inputClass}
              />
            )}
            {errors[name] && <p className="mt-1 text-xs text-red-500">{errors[name]?.message}</p>}
          </div>
        ))}

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
            409: "An account with this phone or email already exists.",
            502: "We couldn't send the OTP. Please try again.",
          })}
        </p>
      )}

      <Button tone="navy" fullWidth type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Creating account…" : "Sign Up"}
      </Button>

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
