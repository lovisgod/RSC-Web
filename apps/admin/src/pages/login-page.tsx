import { Button, Input } from "@rsc/ui";
import { loginInputSchema } from "@rsc/contracts";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { apiClient } from "../lib/api";
import { toastBus } from "../lib/toast-bus";
import { authStore } from "../stores/auth-store";

const schema = loginInputSchema.extend({
  identifier: z.string().min(1, "Email or phone is required"),
  password: z.string().min(1, "Password is required"),
});

type FieldErrors = Partial<Record<keyof z.infer<typeof schema>, string>>;

export function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: () => apiClient.login({ identifier: identifier.trim(), password }),
    onSuccess: (data) => {
      authStore.setUser({ id: data.user.id, role: data.user.role });
      toastBus.emit("Welcome back!", "success");
      navigate("/", { replace: true });
    },
    onError: (err: Error) => {
      toastBus.emit(err.message, "error");
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
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand__mark">R</span>
          <span className="auth-brand__name">
            <strong>RSC Central</strong>
            <small>Operations dashboard</small>
          </span>
        </div>

        <h1 className="auth-heading">Sign in</h1>
        <p className="auth-sub">Enter your admin credentials to continue.</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <Input
            id="identifier"
            label="Email or phone"
            type="text"
            placeholder="admin@rsc.com"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            error={errors.identifier}
          />

          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />

          {error && (
            <p className="auth-api-error" role="alert">
              {(error as Error).message}
            </p>
          )}

          <div className="auth-submit">
            <Button tone="navy" fullWidth disabled={isPending} type="submit">
              {isPending ? "Signing in…" : "Sign in"}
            </Button>
          </div>
        </form>

        <p className="auth-footer">
          Don&apos;t have an account? <Link to="/register">Create admin account</Link>
        </p>
      </div>
    </div>
  );
}
