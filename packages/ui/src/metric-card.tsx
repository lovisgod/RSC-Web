import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  detail: string;
  tone?: "default" | "warning";
}

export function MetricCard({ detail, label, tone = "default", value }: MetricCardProps) {
  return (
    <article className={`rsc-metric rsc-metric--${tone}`}>
      <p className="rsc-metric__label">{label}</p>
      <strong className="rsc-metric__value">{value}</strong>
      <p className="rsc-metric__detail">{detail}</p>
    </article>
  );
}
