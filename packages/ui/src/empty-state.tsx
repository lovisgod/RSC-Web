import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  heading: string;
  body?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, heading, body, action }: EmptyStateProps) {
  return (
    <div className="rsc-empty-state">
      <span className="rsc-empty-state__icon" aria-hidden="true">
        {icon}
      </span>
      <p className="rsc-empty-state__heading">{heading}</p>
      {body && <p className="rsc-empty-state__body">{body}</p>}
      {action && <div className="rsc-empty-state__action">{action}</div>}
    </div>
  );
}
