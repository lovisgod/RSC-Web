import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { logout as apiLogout } from "../lib/api";
import { toastBus } from "../lib/toast-bus";
import { useAuth } from "./use-auth";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const LAST_ACTIVITY_KEY = "rsc:outlet-admin:last-activity-at";
const ACTIVITY_EVENTS = [
  "click",
  "keydown",
  "mousemove",
  "pointerdown",
  "scroll",
  "touchstart",
] as const;

function getLastActivityAt() {
  const stored = Number(window.localStorage.getItem(LAST_ACTIVITY_KEY));
  return Number.isFinite(stored) && stored > 0 ? stored : Date.now();
}

export function useIdleLogout() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const timeoutRef = useRef<number | null>(null);
  const isLoggingOutRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    function clearIdleTimer() {
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    async function logoutForInactivity() {
      if (isLoggingOutRef.current) {
        return;
      }

      isLoggingOutRef.current = true;
      clearIdleTimer();

      try {
        await apiLogout();
      } catch {
        // Local logout still happens if the server session already expired.
      } finally {
        window.localStorage.removeItem(LAST_ACTIVITY_KEY);
        queryClient.clear();
        logout();
        toastBus.emit("Signed out after 30 minutes of inactivity", "info");
        navigate("/login", { replace: true });
      }
    }

    function scheduleIdleCheck() {
      clearIdleTimer();

      const elapsedMs = Date.now() - getLastActivityAt();
      const remainingMs = IDLE_TIMEOUT_MS - elapsedMs;

      if (remainingMs <= 0) {
        void logoutForInactivity();
        return;
      }

      timeoutRef.current = window.setTimeout(() => {
        void logoutForInactivity();
      }, remainingMs);
    }

    function recordActivity() {
      if (isLoggingOutRef.current) {
        return;
      }

      window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      scheduleIdleCheck();
    }

    function syncActivity(event: StorageEvent) {
      if (event.key === LAST_ACTIVITY_KEY) {
        scheduleIdleCheck();
      }
    }

    if (!window.localStorage.getItem(LAST_ACTIVITY_KEY)) {
      window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    }

    scheduleIdleCheck();
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, { passive: true });
    });
    window.addEventListener("storage", syncActivity);

    return () => {
      clearIdleTimer();
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity);
      });
      window.removeEventListener("storage", syncActivity);
    };
  }, [isAuthenticated, logout, navigate, queryClient]);
}
