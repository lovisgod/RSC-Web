import { Button } from "@rsc/ui";
import { Copy, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useOnboardOutletAdmin } from "../hooks/use-onboard-outlet-admin";
import type { AdminResult } from "@rsc/contracts";

interface Props {
  open: boolean;
  outletId: string;
  onClose: () => void;
}

const EMPTY_FORM = { name: "", email: "", phone: "" };

export function OutletAdminModal({ open, outletId, onClose }: Props) {
  if (!open) return null;

  return <OutletAdminModalContent key={outletId} outletId={outletId} onClose={onClose} />;
}

function OutletAdminModalContent({ outletId, onClose }: Omit<Props, "open">) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [result, setResult] = useState<AdminResult | null>(null);
  const [copied, setCopied] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const { mutate, isPending, reset: resetMutation } = useOnboardOutletAdmin();

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
        setForm((p) => ({ ...p, [key]: e.target.value })),
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) return;
    mutate(
      { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), outletId },
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
        aria-labelledby="admin-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal__head">
          <div>
            <p className="kicker" style={{ margin: 0 }}>
              Outlet management
            </p>
            <h2 id="admin-modal-title">Onboard Outlet Admin</h2>
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

        {/* Success state */}
        {result ? (
          <div className="modal__body">
            <div className="admin-success">
              <p className="admin-success__heading">Admin account created</p>
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
                  <strong>Role:</strong> {result.role}
                </span>
              </div>
            </div>

            <div className="modal__actions">
              <Button tone="navy" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* Form state */
          <form className="modal__body" onSubmit={handleSubmit} noValidate>
            <label className="field-label">
              Full Name *
              <input
                ref={firstFieldRef}
                className="field-input"
                type="text"
                placeholder="e.g. Amaka Obi"
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
                  placeholder="amaka@outlet.com"
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
                {isPending ? "Creating…" : "Create Admin"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
