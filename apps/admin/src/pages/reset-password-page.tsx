import { Button } from "@rsc/ui";
import { nigerianPhoneNumberSchema, registerCustomerInputSchema } from "@rsc/contracts";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { OtpInput } from "../components/otp-input";
import { PasswordInput } from "../components/password-input";
import { resetPassword } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

interface ResetState {
  identifier: string;
  otpExpiresInSeconds: number;
}

const passwordSchema = registerCustomerInputSchema.shape.password;

const schema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FieldErrors = Partial<Record<"newPassword" | "confirmPassword", string>>;

function isPhone(v: string) {
  return nigerianPhoneNumberSchema.safeParse(v).success;
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as ResetState | null;

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [otpError, setOtpError] = useState("");

  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: () => {
      if (!state) throw new Error("Password reset session is missing");
      const codeField = isPhone(state.identifier) ? { phoneCode: otp } : { emailCode: otp };
      return resetPassword({ identifier: state.identifier, newPassword, ...codeField });
    },
    onSuccess: () => {
      toastBus.emit("Password reset successfully! Please sign in.", "success");
      navigate("/login", { replace: true });
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });

  if (!state) return <Navigate to="/forgot-password" replace />;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (otp.length < 6) {
      setOtpError("Enter the 6-digit code");
      return;
    }
    setOtpError("");

    const result = schema.safeParse({ newPassword, confirmPassword });
    if (!result.success) {
      const errs: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setFieldErrors({});
    reset();
    mutate();
  }

  const maskedContact = isPhone(state.identifier)
    ? state.identifier.replace(/(\d{4})\d{4}(\d+)/, "$1****$2")
    : state.identifier.replace(/(.{2}).+(@.+)/, "$1*****$2");

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand__mark">R</span>
          <span className="auth-brand__name">
            <strong>DineOut NG Central</strong>
            <small>Operations dashboard</small>
          </span>
        </div>

        <h1 className="auth-heading">Reset password</h1>
        <p className="auth-sub">
          Enter the 6-digit code sent to <strong>{maskedContact}</strong> and choose a new password.
        </p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="otp-section">
            <label
              className="rsc-field__label"
              style={{ marginBottom: "0.5rem", display: "block" }}
            >
              Verification code
            </label>
            <OtpInput value={otp} onChange={setOtp} error={!!otpError} />
            {otpError && <p className="rsc-field__error">{otpError}</p>}
          </div>

          <div className="auth-divider">new password</div>

          <PasswordInput
            id="newPassword"
            label="New password"
            placeholder="min. 8 characters"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={fieldErrors.newPassword}
            hint="At least 8 characters"
          />

          <PasswordInput
            id="confirmPassword"
            label="Confirm new password"
            placeholder="••••••••"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={fieldErrors.confirmPassword}
          />

          {error && (
            <p className="auth-api-error" role="alert">
              {(error as Error).message}
            </p>
          )}

          <div className="auth-submit">
            <Button tone="navy" fullWidth type="submit" disabled={isPending}>
              {isPending ? "Resetting…" : "Reset password"}
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
