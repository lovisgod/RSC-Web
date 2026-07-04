import { Button } from "@rsc/ui";
import { KeyRound, ShieldCheck, X } from "lucide-react";
import { useState, type FormEvent } from "react";

import { PasswordInput } from "../components/password-input";
import { useChangePassword } from "../hooks/use-change-password";

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

type PasswordErrors = Partial<Record<keyof PasswordForm, string>>;

const EMPTY_FORM: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function SettingsPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<PasswordForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<PasswordErrors>({});
  const changePassword = useChangePassword();

  function updateField(field: keyof PasswordForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (changePassword.isError) changePassword.reset();
  }

  function validate(): boolean {
    const nextErrors: PasswordErrors = {};
    if (!form.currentPassword) {
      nextErrors.currentPassword = "Current password is required";
    }
    if (form.newPassword.length < 8) {
      nextErrors.newPassword = "New password must be at least 8 characters";
    } else if (form.newPassword.length > 128) {
      nextErrors.newPassword = "New password must be 128 characters or fewer";
    }
    if (!form.confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your new password";
    } else if (form.confirmPassword !== form.newPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    changePassword.mutate(
      {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      },
      {
        onSuccess: () => {
          setForm(EMPTY_FORM);
          setErrors({});
          setIsEditing(false);
        },
      },
    );
  }

  function handleCancel() {
    if (changePassword.isPending) return;
    setForm(EMPTY_FORM);
    setErrors({});
    changePassword.reset();
    setIsEditing(false);
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--rsc-brand)]">
          Account
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Manage the security of your outlet-admin account.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--rsc-main)_10%,white)] text-[var(--rsc-main)]">
              <ShieldCheck size={21} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Password security</h2>
              <p className="mt-1 text-sm text-slate-500">
                Use a strong password that you do not use elsewhere.
              </p>
            </div>
          </div>

          {!isEditing && (
            <Button
              tone="navy"
              type="button"
              className="shrink-0 gap-2"
              onClick={() => setIsEditing(true)}
            >
              <KeyRound size={17} aria-hidden="true" />
              Change password
            </Button>
          )}
        </div>

        {isEditing ? (
          <form className="space-y-5 p-5 sm:p-6" onSubmit={handleSubmit} noValidate>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Set a new password</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Your new password must contain at least 8 characters.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                disabled={changePassword.isPending}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--rsc-main)] disabled:opacity-50"
                aria-label="Cancel password change"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <PasswordInput
                  id="current-password"
                  label="Current password"
                  value={form.currentPassword}
                  onChange={(event) => updateField("currentPassword", event.target.value)}
                  error={errors.currentPassword}
                  autoComplete="current-password"
                  disabled={changePassword.isPending}
                />
              </div>
              <PasswordInput
                id="new-password"
                label="New password"
                value={form.newPassword}
                onChange={(event) => updateField("newPassword", event.target.value)}
                error={errors.newPassword}
                autoComplete="new-password"
                disabled={changePassword.isPending}
              />
              <PasswordInput
                id="confirm-password"
                label="Confirm new password"
                value={form.confirmPassword}
                onChange={(event) => updateField("confirmPassword", event.target.value)}
                error={errors.confirmPassword}
                autoComplete="new-password"
                disabled={changePassword.isPending}
              />
            </div>

            {changePassword.isError && (
              <p
                className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
                role="alert"
              >
                {changePassword.error.message}
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <Button
                tone="quiet"
                type="button"
                onClick={handleCancel}
                disabled={changePassword.isPending}
              >
                Cancel
              </Button>
              <Button tone="navy" type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending ? "Changing password…" : "Update password"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-5 sm:p-6">
            <p className="text-sm leading-6 text-slate-500">
              Changing your password helps protect outlet operations and order data from
              unauthorized access.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
