import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import { useEffect, useState } from "react";

import { toastBus, type ToastItem } from "../lib/toast-bus";

const SEVERITY_COLORS: Record<ToastItem["severity"], string> = {
  success: "#16a34a",
  error: "#a33a2b",
  warning: "#d4832a",
  info: "#1e3160",
};

export function Toaster() {
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const [current, setCurrent] = useState<ToastItem | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => toastBus.subscribe((item) => setQueue((q) => [...q, item])), []);

  useEffect(() => {
    if (!open && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue((q) => q.slice(1));
      setOpen(true);
    }
  }, [open, queue]);

  function handleClose(_: unknown, reason?: string) {
    if (reason === "clickaway") return;
    setOpen(false);
  }

  return (
    <Snackbar
      open={open}
      autoHideDuration={4500}
      onClose={handleClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      {current ? (
        <Alert
          severity={current.severity}
          variant="filled"
          onClose={() => setOpen(false)}
          sx={{
            minWidth: 280,
            borderRadius: "14px",
            fontSize: "0.875rem",
            fontFamily: "inherit",
            fontWeight: 500,
            background: SEVERITY_COLORS[current.severity],
            boxShadow: "0 8px 32px rgb(0 0 0 / 18%)",
            "& .MuiAlert-icon": { opacity: 0.9 },
          }}
        >
          {current.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
}
