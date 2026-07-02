import { useSyncExternalStore } from "react";
import { authStore } from "../stores/auth-store";

export function useAuth() {
  const user = useSyncExternalStore(authStore.subscribe, authStore.getUser, authStore.getUser);

  return {
    user,
    isAuthenticated: user !== null,
    logout: () => authStore.setUser(null),
  };
}
