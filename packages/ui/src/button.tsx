import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  tone?: "primary" | "quiet";
}

export function Button({ children, className = "", tone = "primary", ...props }: ButtonProps) {
  return (
    <button className={`rsc-button rsc-button--${tone} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
