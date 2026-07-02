import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { PasswordInput } from "../components/password-input";
import { login } from "../lib/api";
import { toastBus } from "../lib/toast-bus";
import { authStore } from "../stores/auth-store";

const schema = z.object({
  identifier: z.string().min(1, "Email or phone is required"),
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
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500 text-lg font-black text-white">
            R
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-slate-900">RSC Outlet Admin</p>
            <p className="text-xs text-slate-500">Staff sign-in</p>
          </div>
        </div>

        <h1 className="mb-1 text-xl font-bold text-slate-900">Sign in</h1>
        <p className="mb-6 text-sm text-slate-500">Enter your outlet staff credentials.</p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="identifier" className="text-sm font-medium text-slate-700">
              Email or phone
            </label>
            <input
              id="identifier"
              type="text"
              autoComplete="username"
              placeholder="staff@outlet.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className={`rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-slate-900 ${errors.identifier ? "border-red-500" : "border-slate-300"}`}
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
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
              {(error as Error).message}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 w-full rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            {isPending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
