import { nigerianPhoneNumberSchema } from "@rsc/contracts";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { PasswordInput } from "../components/password-input";
import { login } from "../lib/api";
import { toastBus } from "../lib/toast-bus";
import { authStore } from "../stores/auth-store";

const schema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Email or phone is required")
    .refine(
      (value) =>
        z.string().email().safeParse(value).success ||
        nigerianPhoneNumberSchema.safeParse(value).success,
      "Enter a valid email address or Nigerian phone number",
    ),
  password: z.string().min(1, "Password is required"),
});

type FieldErrors = Partial<Record<"identifier" | "password", string>>;

export function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: () => login({ identifier: identifier.trim(), password }),
    onSuccess: (data) => {
      authStore.setUser({ id: data.user.id, role: data.user.role, outletId: data.user.outletId });
      toastBus.emit("Welcome back!", "success");
      navigate("/", { replace: true });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = schema.safeParse({ identifier: identifier.trim(), password });
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
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--rsc-brand)_18%,transparent),transparent_34%),linear-gradient(135deg,var(--rsc-sidebar-bg)_0%,var(--rsc-navy-dark)_100%)] p-4">
      {/* <ThemeToggle className="fixed right-4 top-4 z-10" /> */}
      <div className="w-full max-w-sm rounded-[1.75rem] border border-[color:color-mix(in_srgb,var(--rsc-main)_12%,white)] bg-[var(--rsc-panel)] p-8 shadow-[0_28px_80px_color-mix(in_srgb,var(--rsc-sidebar-bg)_38%,transparent)]">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--rsc-main)] text-lg font-black text-white shadow-[0_14px_32px_color-mix(in_srgb,var(--rsc-main)_28%,transparent)]">
            D
          </div>
          <div>
            <p className="text-sm font-black leading-tight text-[var(--rsc-ink)]">DineOut NG</p>
            <p className="text-xs font-medium text-[var(--rsc-muted)]">Outlet staff sign-in</p>
          </div>
        </div>

        <h1 className="mb-1 text-2xl font-black tracking-tight text-[var(--rsc-ink)]">Sign in</h1>
        <p className="mb-6 text-sm leading-6 text-[var(--rsc-muted)]">
          Enter your outlet staff credentials to manage orders and menu operations.
        </p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="identifier" className="text-sm font-bold text-[var(--rsc-ink)]">
              Email or phone
            </label>
            <input
              id="identifier"
              type="text"
              autoComplete="username"
              placeholder="staff@outlet.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className={`rounded-xl border bg-[var(--rsc-field-bg)] px-3 py-3 text-sm font-medium text-[var(--rsc-field-ink)] outline-none transition placeholder:text-[color:color-mix(in_srgb,var(--rsc-field-ink)_42%,transparent)] focus:border-[var(--rsc-main)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--rsc-main)_18%,transparent)] ${errors.identifier ? "border-red-500" : "border-[var(--rsc-line)]"}`}
            />
            {errors.identifier && <p className="text-xs text-red-600">{errors.identifier}</p>}
          </div>

          <PasswordInput
            id="password"
            label="Password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />

          {error && (
            <p
              className="rounded-xl bg-[color-mix(in_srgb,var(--rsc-danger)_10%,var(--rsc-panel))] px-3 py-2 text-sm font-medium text-red-600"
              role="alert"
            >
              {(error as Error).message}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 w-full rounded-xl bg-[linear-gradient(135deg,var(--rsc-main),var(--rsc-navy-light))] py-3 text-sm font-bold text-white shadow-[0_16px_34px_color-mix(in_srgb,var(--rsc-main)_25%,transparent)] transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60"
          >
            {isPending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
