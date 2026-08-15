import { Button, CssBrandLogo, Input } from "@rsc/ui";
import { nigerianPhoneNumberSchema } from "@rsc/contracts";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { forgotPassword } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

const identifierSchema = z
  .string()
  .trim()
  .min(1, "Email or phone is required")
  .refine(
    (value) =>
      z.string().email().safeParse(value).success ||
      nigerianPhoneNumberSchema.safeParse(value).success,
    "Enter a valid email address or Nigerian phone number",
  );

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [fieldError, setFieldError] = useState("");

  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: () => {
      const parsed = identifierSchema.parse(identifier);
      return forgotPassword({ identifier: parsed });
    },
    onSuccess: (data) => {
      toastBus.emit("Reset code sent!", "success");
      navigate("/reset-password", {
        state: {
          identifier: identifier.trim(),
          otpExpiresInSeconds: data.otpExpiresInSeconds,
        },
      });
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = identifierSchema.safeParse(identifier);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Enter a valid email or phone number");
      return;
    }
    setFieldError("");
    reset();
    mutate();
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <CssBrandLogo size="sm" tagline="Operations dashboard" />
        </div>

        <h1 className="auth-heading">Forgot password?</h1>
        <p className="auth-sub">
          Enter your registered email or phone number and we&apos;ll send you a reset code.
        </p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <Input
            id="identifier"
            label="Email or phone"
            type="text"
            placeholder="admin@rsc.com or 08012345678"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            error={fieldError}
          />

          {error && (
            <p className="auth-api-error" role="alert">
              {(error as Error).message}
            </p>
          )}

          <div className="auth-submit">
            <Button tone="navy" fullWidth type="submit" disabled={isPending}>
              {isPending ? "Sending code…" : "Send reset code"}
            </Button>
          </div>
        </form>

        <p className="auth-footer">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
