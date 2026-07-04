import { useEffect, useState } from "react";
import { toastBus, type ToastItem } from "../lib/toast-bus";

const SEVERITY_CLASSES: Record<ToastItem["severity"], string> = {
  success: "bg-green-600 text-white",
  error: "bg-red-700 text-white",
  warning: "bg-amber-500 text-white",
  info: "bg-slate-800 text-white",
};

export function Toaster() {
  const [queue, setQueue] = useState<ToastItem[]>([]);

  useEffect(() => toastBus.subscribe((item) => setQueue((q) => [...q, item])), []);

  const current = queue[0];
  if (!current) return null;

  return (
    <ToastMessage
      key={current.id}
      item={current}
      onDismiss={() => setQueue((currentQueue) => currentQueue.slice(1))}
    />
  );
}

function ToastMessage({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(id);
  }, [onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed bottom-4 right-4 z-50 flex min-w-[280px] max-w-sm items-start gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-2xl ${SEVERITY_CLASSES[item.severity]}`}
    >
      <span className="flex-1">{item.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="mt-px shrink-0 opacity-70 transition hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}
