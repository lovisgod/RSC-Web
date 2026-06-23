import { useId, forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | undefined;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const defaultId = useId();
    const inputId = id || defaultId;

    return (
      <div className="w-full flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-xs font-bold text-rsc-ink uppercase tracking-wider block"
        >
          {label}
        </label>
        <input
          id={inputId}
          ref={ref}
          className={`w-full border border-rsc-line bg-white text-rsc-ink rounded-xl px-4 py-3 outline-none transition-all duration-150 focus:ring-2 focus:ring-rsc-brand/30 focus:border-rsc-brand placeholder:text-gray-400 ${
            error ? "border-rsc-danger focus:ring-rsc-danger/20 focus:border-rsc-danger" : ""
          } ${className}`.trim()}
          {...props}
        />
        {error && <span className="text-xs font-medium text-rsc-danger mt-0.5">{error}</span>}
      </div>
    );
  },
);

Input.displayName = "Input";
