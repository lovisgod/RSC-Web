import type { ReactNode } from "react";

export interface QueueItem {
  icon: ReactNode;
  label: string;
  detail: string;
  tone?: "danger";
}

interface OperationsQueueProps {
  items: QueueItem[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function OperationsQueue({
  items,
  isLoading = false,
  isError = false,
  onRetry,
}: OperationsQueueProps) {
  return (
    <article className="panel">
      <div className="panel__heading">
        <div>
          <p className="kicker">Attention</p>
          <h2>Operations queue</h2>
        </div>
      </div>
      {isLoading ? (
        <div className="queue-loading" aria-label="Loading operations queue">
          <span />
          <span />
        </div>
      ) : isError ? (
        <div className="panel-state panel-state--error">
          <strong>Queue is unavailable</strong>
          <span>We could not load operations attention items.</span>
          <button type="button" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="panel-state panel-state--success">
          <strong>Operations are clear</strong>
          <span>No delayed kitchen tickets or paused outlets.</span>
        </div>
      ) : (
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
      )}
    </article>
  );
}
