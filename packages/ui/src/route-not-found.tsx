import type { ReactNode } from "react";

export interface RouteNotFoundAction {
  label: string;
  href: string;
}

interface RouteNotFoundProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  primaryAction: RouteNotFoundAction;
  secondaryAction?: RouteNotFoundAction;
  hint?: string;
  className?: string;
  children?: ReactNode;
}

export function RouteNotFound({
  eyebrow = "404",
  title = "This route does not exist",
  description = "The page may have moved, the link may be incomplete, or this workspace does not include that route.",
  primaryAction,
  secondaryAction,
  hint = "If you copied this link from somewhere, check that the address is complete.",
  className = "",
  children,
}: RouteNotFoundProps) {
  return (
    <section
      className={`rsc-not-found ${className}`.trim()}
      aria-labelledby="route-not-found-title"
    >
      <div className="rsc-not-found__card">
        <div className="rsc-not-found__visual" aria-hidden="true">
          <span className="rsc-not-found__orb rsc-not-found__orb--one" />
          <span className="rsc-not-found__orb rsc-not-found__orb--two" />
          <span className="rsc-not-found__route">
            <span />
            <span />
            <span />
          </span>
        </div>

        <div className="rsc-not-found__copy">
          <span className="rsc-not-found__eyebrow">{eyebrow}</span>
          <h1 id="route-not-found-title">{title}</h1>
          <p>{description}</p>
        </div>

        {children && <div className="rsc-not-found__content">{children}</div>}

        <div className="rsc-not-found__actions">
          <a className="rsc-button rsc-button--navy" href={primaryAction.href}>
            {primaryAction.label}
          </a>
          {secondaryAction && (
            <a className="rsc-button rsc-button--quiet" href={secondaryAction.href}>
              {secondaryAction.label}
            </a>
          )}
        </div>

        {hint && <p className="rsc-not-found__hint">{hint}</p>}
      </div>
    </section>
  );
}
