export type ToastSeverity = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: number;
  message: string;
  severity: ToastSeverity;
}

type Listener = (item: ToastItem) => void;

let listeners: Listener[] = [];
let counter = 0;

export const toastBus = {
  emit(message: string, severity: ToastSeverity = "success") {
    const item: ToastItem = { id: ++counter, message, severity };
    listeners.forEach((l) => l(item));
  },
  subscribe(listener: Listener) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },
};
