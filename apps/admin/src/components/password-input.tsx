import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface PasswordInputProps {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  hint?: string;
  autoComplete?: string;
}

export function PasswordInput({
  id,
  label,
  placeholder,
  value,
  onChange,
  error,
  hint,
  autoComplete,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="rsc-field">
      <label className="rsc-field__label" htmlFor={id}>
        {label}
      </label>

      {hint && (
        <p id={hintId} className="rsc-field__hint">
          {hint}
        </p>
      )}

      <div className="pw-wrap">
        <input
          id={id}
          type={visible ? "text" : "password"}
          className={`rsc-input pw-input${error ? " rsc-input--error" : ""}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
        />
        <button
          type="button"
          className="pw-toggle"
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
      </div>

      {error && (
        <p id={errorId} className="rsc-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
