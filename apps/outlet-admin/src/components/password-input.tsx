import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | undefined;
}

export function PasswordInput({ label, error, id, ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-bold text-[var(--rsc-ink)]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          className={`w-full rounded-xl border bg-[var(--rsc-field-bg)] px-3 py-3 pr-10 text-sm font-medium text-[var(--rsc-field-ink)] outline-none transition placeholder:text-[color:color-mix(in_srgb,var(--rsc-field-ink)_42%,transparent)] focus:border-[var(--rsc-main)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--rsc-main)_18%,transparent)] ${error ? "border-red-500" : "border-[var(--rsc-line)]"}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--rsc-muted)] transition hover:text-[var(--rsc-main)]"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
