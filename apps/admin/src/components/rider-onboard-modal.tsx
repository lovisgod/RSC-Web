import { Button } from "@rsc/ui";
import { Copy, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useOnboardRider } from "../hooks/use-onboard-rider";
import type { RiderResult } from "../lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
}

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  vehicleType: "",
  plateNumber: "",
};

export function RiderOnboardModal({ open, onClose }: Props) {
  if (!open) return null;

  return <RiderOnboardModalContent onClose={onClose} />;
}

function RiderOnboardModalContent({ onClose }: Pick<Props, "onClose">) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [result, setResult] = useState<RiderResult | null>(null);
  const [copied, setCopied] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const { mutate, isPending, reset: resetMutation } = useOnboardRider();

  useEffect(() => {
    const id = setTimeout(() => firstFieldRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape" && !isPending) {
        resetMutation();
        onClose();
      }
    }

    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [isPending, onClose, resetMutation]);

  function handleClose() {
    if (isPending) return;
    resetMutation();
    onClose();
  }

  function field(key: keyof typeof EMPTY_FORM) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((previous) => ({ ...previous, [key]: e.target.value })),
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) return;

    mutate(
      {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        ...(form.vehicleType.trim() ? { vehicleType: form.vehicleType.trim() } : {}),
        ...(form.plateNumber.trim() ? { plateNumber: form.plateNumber.trim() } : {}),
      },
      { onSuccess: (data) => setResult(data) },
    );
  }

  function copyPassword() {
    if (!result) return;
    navigator.clipboard.writeText(result.temporaryPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return createPortal(
    <div className="modal-overlay" aria-hidden="true" onClick={handleClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rider-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <div>
            <p className="kicker" style={{ margin: 0 }}>
              Rider operations
            </p>
            <h2 id="rider-modal-title">Onboard Rider</h2>
          </div>
          <button
            type="button"
            className="modal__close"
            aria-label="Close"
            disabled={isPending}
            onClick={handleClose}
          >
            <X size={18} />
          </button>
        </div>

        {result ? (
          <div className="modal__body">
            <div className="admin-success">
              <p className="admin-success__heading">Rider account created</p>
              <p className="admin-success__sub">
                Share the temporary password with <strong>{result.name}</strong>. They must change
                it on first login.
              </p>

              <div className="admin-success__field">
                <span className="admin-success__label">Temporary Password</span>
                <div className="admin-success__password">
                  <code className="admin-success__code">{result.temporaryPassword}</code>
                  <button
                    type="button"
                    className="admin-success__copy"
                    aria-label="Copy password"
                    onClick={copyPassword}
                  >
                    <Copy size={14} />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="admin-success__meta">
                <span>
                  <strong>Name:</strong> {result.name}
                </span>
                <span>
                  <strong>Status:</strong> {result.riderStatus ?? "AVAILABLE"}
                </span>
                {result.vehicleType && (
                  <span>
                    <strong>Vehicle:</strong> {result.vehicleType}
                  </span>
                )}
              </div>
            </div>

            <div className="modal__actions">
              <Button tone="navy" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form className="modal__body" onSubmit={handleSubmit} noValidate>
            <label className="field-label">
              Full Name *
              <input
                ref={firstFieldRef}
                className="field-input"
                type="text"
                placeholder="e.g. Musa Ade"
                required
                {...field("name")}
              />
            </label>

            <div className="modal-row">
              <label className="field-label">
                Email Address *
                <input
                  className="field-input"
                  type="email"
                  placeholder="musa@rider.com"
                  required
                  {...field("email")}
                />
              </label>

              <label className="field-label">
                Phone Number *
                <input
                  className="field-input"
                  type="tel"
                  placeholder="08012345678"
                  required
                  {...field("phone")}
                />
              </label>
            </div>

            <div className="modal-row">
              <label className="field-label">
                Vehicle Type
                <input
                  className="field-input"
                  type="text"
                  placeholder="e.g. Bike"
                  {...field("vehicleType")}
                />
              </label>

              <label className="field-label">
                Plate Number
                <input
                  className="field-input"
                  type="text"
                  placeholder="ABC-123XY"
                  {...field("plateNumber")}
                />
              </label>
            </div>

            <div className="modal__actions">
              <Button tone="quiet" type="button" onClick={handleClose} disabled={isPending}>
                Cancel
              </Button>
              <Button
                tone="navy"
                type="submit"
                disabled={
                  isPending || !form.name.trim() || !form.email.trim() || !form.phone.trim()
                }
              >
                {isPending ? "Creating…" : "Create Rider"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
