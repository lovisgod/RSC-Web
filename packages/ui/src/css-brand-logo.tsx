interface CssBrandLogoProps {
  className?: string;
  tagline?: string;
  size?: "sm" | "md" | "lg";
}

export function CssBrandLogo({ className = "", tagline, size = "md" }: CssBrandLogoProps) {
  return (
    <span
      className={`rsc-css-logo rsc-css-logo--${size} ${className}`.trim()}
      aria-label="DineOut NG"
    >
      <span className="rsc-css-logo__wordmark" aria-hidden="true">
        <span className="rsc-css-logo__dine">Dine</span>
        <span className="rsc-css-logo__out">Out</span>
      </span>
      <span className="rsc-css-logo__rule" aria-hidden="true" />
      <span className="rsc-css-logo__ng" aria-hidden="true">
        NG
      </span>
      {tagline ? <span className="rsc-css-logo__tagline">{tagline}</span> : null}
    </span>
  );
}
