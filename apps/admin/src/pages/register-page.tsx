import { Button, Input } from "@rsc/ui";
import { NIGERIAN_MOBILE_NUMBER_PATTERN, registerCustomerInputSchema } from "@rsc/contracts";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { toastBus } from "../lib/toast-bus";
import { authStore } from "../stores/auth-store";

const schema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
    phone: z
      .string()
      .trim()
      .regex(NIGERIAN_MOBILE_NUMBER_PATTERN, "Enter a valid Nigerian number e.g. 08012345678"),
    // Reuse the existing password Zod schema from contracts
    password: registerCustomerInputSchema.shape.password.refine(
      (p) => p.length >= 8,
      "Password must be at least 8 characters",
    ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;
type FieldErrors = Partial<Record<keyof FormData, string>>;

const EMPTY: Omit<FormData, never> = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});

  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          password: form.password,
          role: "SUPER_ADMIN",
        }),
      });

      const payload: { message?: string; data?: { userId?: string; role?: string } } = await res
        .json()
        .catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message ?? `Registration failed (${res.status})`);
      }

      return payload;
    },
    onSuccess: (data) => {
      toastBus.emit(data.message ?? "Account created — please sign in", "success");
      // If server returns user data directly, sign them in; otherwise go to login
      if (data.data?.userId) {
        authStore.setUser({ id: data.data.userId, role: "SUPER_ADMIN" });
        navigate("/", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    },
    onError: (err: Error) => {
      toastBus.emit(err.message, "error");
    },
  });

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = schema.safeParse(form);
    if (!result.success) {
      const fieldErrs: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (!fieldErrs[key]) fieldErrs[key] = issue.message;
      }
      setErrors(fieldErrs);
      return;
    }
    setErrors({});
    reset();
    mutate();
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand__mark">R</span>
          <span className="auth-brand__name">
            <strong>RSC Central</strong>
            <small>Operations dashboard</small>
          </span>
        </div>

        <h1 className="auth-heading">Create account</h1>
        <p className="auth-sub">
          Registered as <strong>SUPER_ADMIN</strong>.
        </p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-row">
            <Input
              id="name"
              label="Full name"
              type="text"
              placeholder="Ada Okonkwo"
              autoComplete="name"
              value={form.name}
              onChange={set("name")}
              error={errors.name}
            />

            <Input
              id="phone"
              label="Phone number"
              type="tel"
              placeholder="08012345678"
              autoComplete="tel"
              value={form.phone}
              onChange={set("phone")}
              error={errors.phone}
            />
          </div>

          <Input
            id="email"
            label="Email address"
            type="email"
            placeholder="admin@rscdelivery.com"
            autoComplete="email"
            value={form.email}
            onChange={set("email")}
            error={errors.email}
          />

          <div className="auth-row">
            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="min. 8 characters"
              autoComplete="new-password"
              value={form.password}
              onChange={set("password")}
              error={errors.password}
              hint="At least 8 characters"
            />

            <Input
              id="confirmPassword"
              label="Confirm password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={set("confirmPassword")}
              error={errors.confirmPassword}
            />
          </div>

          {error && (
            <p className="auth-api-error" role="alert">
              {(error as Error).message}
            </p>
          )}

          <div className="auth-submit">
            <Button tone="navy" fullWidth disabled={isPending} type="submit">
              {isPending ? "Creating account…" : "Create account"}
            </Button>
          </div>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
