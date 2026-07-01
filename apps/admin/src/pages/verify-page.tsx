import { Button } from "@rsc/ui";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { OtpInput } from "../components/otp-input";
import { resendVerificationCode, verifyUser } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

interface VerifyState {
  email: string;
  phone: string;
  otpExpiresInSeconds: number;
  verificationChannels: { email: boolean; phone: boolean };
}

function Countdown({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      onExpire();
      return;
    }
    const id = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(id);
  }, [remaining, onExpire]);

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return (
    <span className={`otp-countdown${remaining <= 30 ? " otp-countdown--urgent" : ""}`}>
      {remaining > 0 ? `${m}:${String(s).padStart(2, "0")}` : "Expired"}
    </span>
  );
}

export function VerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as VerifyState | null;

  const bothChannels = state?.verificationChannels?.email && state?.verificationChannels?.phone;

  const [otp, setOtp] = useState("");
  const [expired, setExpired] = useState(false);
  const [otpSecs, setOtpSecs] = useState(state?.otpExpiresInSeconds ?? 300);
  const [countdownVersion, setCountdownVersion] = useState(0);
  const [channel, setChannel] = useState<"email" | "phone">(
    state?.verificationChannels?.phone ? "phone" : "email",
  );

  const {
    mutate: verify,
    isPending: verifying,
    error: verifyErr,
  } = useMutation({
    mutationFn: () => {
      if (!state) throw new Error("Verification session is missing");
      return channel === "phone"
        ? verifyUser({ channel: "phone", phone: state.phone, code: otp })
        : verifyUser({ channel: "email", email: state.email, code: otp });
    },
    onSuccess: () => {
      toastBus.emit("Account verified! You can now sign in.", "success");
      navigate("/login", { replace: true });
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });

  const { mutate: resend, isPending: resending } = useMutation({
    mutationFn: () => {
      if (!state) throw new Error("Verification session is missing");
      return channel === "phone"
        ? resendVerificationCode({ channel: "phone", phone: state.phone })
        : resendVerificationCode({ channel: "email", email: state.email });
    },
    onSuccess: (data) => {
      setOtpSecs(data.otpExpiresInSeconds);
      setCountdownVersion((version) => version + 1);
      setExpired(false);
      setOtp("");
      toastBus.emit("New code sent!", "success");
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });

  if (!state) return <Navigate to="/register" replace />;

  const contact = channel === "phone" ? state.phone : state.email;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length === 6) verify();
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

        <h1 className="auth-heading">Verify your account</h1>
        <p className="auth-sub">
          We sent a 6-digit code to <strong>{contact}</strong>.
        </p>

        {bothChannels && (
          <div className="otp-channel-tabs">
            {(["phone", "email"] as const).map((ch) => (
              <button
                key={ch}
                type="button"
                className={`otp-channel-tab${channel === ch ? " otp-channel-tab--active" : ""}`}
                onClick={() => {
                  setChannel(ch);
                  setOtp("");
                }}
              >
                {ch === "phone" ? "📱 Phone" : "✉️ Email"}
              </button>
            ))}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="otp-section">
            <OtpInput value={otp} onChange={setOtp} error={!!verifyErr} />

            <div className="otp-meta">
              {expired ? (
                <span className="otp-countdown otp-countdown--urgent">Code expired</span>
              ) : (
                <>
                  <span className="otp-meta__label">Expires in</span>
                  <Countdown
                    key={`${channel}-${countdownVersion}`}
                    seconds={otpSecs}
                    onExpire={() => setExpired(true)}
                  />
                </>
              )}
            </div>
          </div>

          <Button
            tone="navy"
            fullWidth
            type="submit"
            disabled={otp.length < 6 || verifying || expired}
          >
            {verifying ? "Verifying…" : "Verify account"}
          </Button>
        </form>

        <div className="otp-resend">
          <span>Didn&apos;t receive the code?</span>
          <button
            type="button"
            className="otp-resend__btn"
            disabled={resending || (!expired && otpSecs > 0)}
            onClick={() => resend()}
          >
            {resending ? "Sending…" : "Resend code"}
          </button>
        </div>

        <p className="auth-footer">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
