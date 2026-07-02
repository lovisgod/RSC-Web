import type { ReactNode } from "react";

interface PageHeadingProps {
  kicker: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeading({ kicker, title, description, action }: PageHeadingProps) {
  return (
    <section className="page-heading">
      <div>
        <p className="kicker">{kicker}</p>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </section>
  );
}
