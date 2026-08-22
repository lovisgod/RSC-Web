interface CssBrandLogoProps {
  className?: string;
  darkSrc?: string;
  lightSrc?: string;
  mode?: "auto" | "dark" | "light";
  tagline?: string;
  size?: "sm" | "md" | "lg";
}

export function CssBrandLogo({
  className = "",
  darkSrc = "/assets/logo2.png",
  lightSrc = "/assets/logo.png",
  mode = "auto",
  tagline,
  size = "md",
}: CssBrandLogoProps) {
  return (
    <span
      className={`rsc-css-logo rsc-css-logo--${size} rsc-css-logo--${mode} ${className}`.trim()}
      aria-label="DineOut NG"
    >
      <img
        alt=""
        aria-hidden="true"
        className="rsc-css-logo__image rsc-css-logo__image--light"
        decoding="async"
        src={lightSrc}
      />
      <img
        alt=""
        aria-hidden="true"
        className="rsc-css-logo__image rsc-css-logo__image--dark"
        decoding="async"
        src={darkSrc}
      />
      {tagline ? <span className="rsc-css-logo__tagline">{tagline}</span> : null}
    </span>
  );
}
