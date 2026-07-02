import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
}

export function Input({ label, error, hint, id, className = "", ...props }: InputProps) {
  const hintId = hint && id ? `${id}-hint` : undefined;
  const errorId = error && id ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`rsc-field${className ? ` ${className}` : ""}`}>
      <label className="rsc-field__label" htmlFor={id}>
        {label}
      </label>

      {hint && (
        <p id={hintId} className="rsc-field__hint">
          {hint}
        </p>
      )}

      <input
        id={id}
        className={`rsc-input${error ? " rsc-input--error" : ""}`}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        {...props}
      />

      {error && (
        <p id={errorId} className="rsc-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
