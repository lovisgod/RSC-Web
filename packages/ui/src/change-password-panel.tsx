import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { Button } from "./button";

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

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  error?: string | undefined;
  autoComplete: string;
  disabled?: boolean;
  showPassword: boolean;
  showIcon: ReactNode;
  hideIcon: ReactNode;
  onToggleVisibility: () => void;
  onChange: (value: string) => void;
}

function PasswordField({
  id,
  label,
  value,
  error,
  autoComplete,
  disabled,
  showPassword,
  showIcon,
  hideIcon,
  onToggleVisibility,
  onChange,
}: PasswordFieldProps) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="rsc-settings-field">
      <label htmlFor={id}>{label}</label>
      <div className="rsc-settings-password">
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          aria-label={showPassword ? "Hide password" : "Show password"}
          tabIndex={-1}
          disabled={disabled}
          onClick={onToggleVisibility}
        >
          {showPassword ? hideIcon : showIcon}
        </button>
      </div>
      {error && (
        <p id={errorId} className="rsc-settings-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export interface ChangePasswordPanelProps {
  title?: string;
  description?: string;
  idleDescription?: string;
  submitError?: string | undefined;
  isSubmitting?: boolean;
  shieldIcon: ReactNode;
  keyIcon: ReactNode;
  closeIcon: ReactNode;
  showPasswordIcon: ReactNode;
  hidePasswordIcon: ReactNode;
  resetSignal?: number | string;
  onSubmit: (input: { currentPassword: string; newPassword: string }) => void;
  onResetError?: () => void;
}

export function ChangePasswordPanel({
  title = "Password security",
  description = "Use a strong password that you do not use elsewhere.",
  idleDescription = "Changing your password helps protect operational data from unauthorized access.",
  submitError,
  isSubmitting = false,
  shieldIcon,
  keyIcon,
  closeIcon,
  showPasswordIcon,
  hidePasswordIcon,
  resetSignal,
  onSubmit,
  onResetError,
}: ChangePasswordPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<PasswordForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [visibleFields, setVisibleFields] = useState<Record<keyof PasswordForm, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  function updateField(field: keyof PasswordForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    onResetError?.();
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

    onSubmit({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    });
  }

  function resetForm() {
    if (isSubmitting) return;
    setForm(EMPTY_FORM);
    setErrors({});
    onResetError?.();
    setIsEditing(false);
  }

  useEffect(() => {
    if (resetSignal === undefined) return;
    setForm(EMPTY_FORM);
    setErrors({});
    setIsEditing(false);
  }, [resetSignal]);

  return (
    <section className="rsc-change-password-panel">
      <div className="rsc-change-password-panel__head">
        <div className="rsc-change-password-panel__title-group">
          <span className="rsc-change-password-panel__icon">{shieldIcon}</span>
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </div>

        {!isEditing && (
          <Button
            tone="navy"
            type="button"
            className="rsc-change-password-panel__cta"
            onClick={() => setIsEditing(true)}
          >
            {keyIcon}
            Change password
          </Button>
        )}
      </div>

      {isEditing ? (
        <form className="rsc-change-password-panel__form" onSubmit={handleSubmit} noValidate>
          <div className="rsc-change-password-panel__form-head">
            <div>
              <h3>Set a new password</h3>
              <p>Your new password must contain at least 8 characters.</p>
            </div>
            <button
              type="button"
              className="rsc-change-password-panel__close"
              aria-label="Cancel password change"
              disabled={isSubmitting}
              onClick={resetForm}
            >
              {closeIcon}
            </button>
          </div>

          <div className="rsc-change-password-panel__grid">
            <div className="rsc-change-password-panel__span">
              <PasswordField
                id="current-password"
                label="Current password"
                value={form.currentPassword}
                error={errors.currentPassword}
                autoComplete="current-password"
                disabled={isSubmitting}
                showPassword={visibleFields.currentPassword}
                showIcon={showPasswordIcon}
                hideIcon={hidePasswordIcon}
                onToggleVisibility={() =>
                  setVisibleFields((current) => ({
                    ...current,
                    currentPassword: !current.currentPassword,
                  }))
                }
                onChange={(value) => updateField("currentPassword", value)}
              />
            </div>
            <PasswordField
              id="new-password"
              label="New password"
              value={form.newPassword}
              error={errors.newPassword}
              autoComplete="new-password"
              disabled={isSubmitting}
              showPassword={visibleFields.newPassword}
              showIcon={showPasswordIcon}
              hideIcon={hidePasswordIcon}
              onToggleVisibility={() =>
                setVisibleFields((current) => ({
                  ...current,
                  newPassword: !current.newPassword,
                }))
              }
              onChange={(value) => updateField("newPassword", value)}
            />
            <PasswordField
              id="confirm-password"
              label="Confirm new password"
              value={form.confirmPassword}
              error={errors.confirmPassword}
              autoComplete="new-password"
              disabled={isSubmitting}
              showPassword={visibleFields.confirmPassword}
              showIcon={showPasswordIcon}
              hideIcon={hidePasswordIcon}
              onToggleVisibility={() =>
                setVisibleFields((current) => ({
                  ...current,
                  confirmPassword: !current.confirmPassword,
                }))
              }
              onChange={(value) => updateField("confirmPassword", value)}
            />
          </div>

          {submitError && (
            <p className="rsc-change-password-panel__error" role="alert">
              {submitError}
            </p>
          )}

          <div className="rsc-change-password-panel__actions">
            <Button tone="quiet" type="button" disabled={isSubmitting} onClick={resetForm}>
              Cancel
            </Button>
            <Button tone="navy" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Changing password…" : "Update password"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="rsc-change-password-panel__idle">
          <p>{idleDescription}</p>
        </div>
      )}
    </section>
  );
}
