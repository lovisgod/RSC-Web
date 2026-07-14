import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonTone = "primary" | "navy" | "danger" | "success" | "quiet";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  tone?: ButtonTone;
  fullWidth?: boolean;
}

export function Button({
  children,
  className = "",
  tone = "primary",
  fullWidth = false,
  ...props
}: ButtonProps) {
  const classes = [
    "rsc-button",
    `rsc-button--${tone}`,
    fullWidth ? "rsc-button--full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
