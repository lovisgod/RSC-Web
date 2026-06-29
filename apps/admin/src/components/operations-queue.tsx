import type { ReactNode } from "react";

export interface QueueItem {
  icon: ReactNode;
  label: string;
  detail: string;
  tone?: "danger";
}

export function OperationsQueue({ items }: { items: QueueItem[] }) {
  return (
    <article className="panel">
      <div className="panel__heading">
        <div>
          <p className="kicker">Attention</p>
          <h2>Operations queue</h2>
        </div>
      </div>
      <ul className="attention-list">
        {items.map((item, i) => (
          <li key={i}>
            <span
              className={`attention-icon${item.tone === "danger" ? " attention-icon--danger" : ""}`}
            >
              {item.icon}
            </span>
            <span>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
