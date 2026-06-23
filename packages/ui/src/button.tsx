// packages/ui/src/Button.tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  // ⚡ Add your new 'auth' tone variant right here in the types!
  tone?: "primary" | "quiet" | "auth";
}

export function Button({ children, className = "", tone = "primary", ...props }: ButtonProps) {
  // Build a clean mapping for your tone style classes
  const toneMap = {
    primary: "rsc-button--primary",
    quiet: "rsc-button--quiet",
    auth: "text-white bg-gradient-to-r from-[#163a6b] to-[#1e4f91] border-none shadow-md hover:opacity-95 transition-opacity duration-150",
  };

  const toneClass = toneMap[tone];

  return (
    <button className={`rsc-button ${toneClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
