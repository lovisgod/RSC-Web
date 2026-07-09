import { useCallback, useSyncExternalStore } from "react";
import { authStore } from "../stores/auth-store";

export function useAuth() {
  const user = useSyncExternalStore(authStore.subscribe, authStore.getUser, authStore.getUser);
  const logout = useCallback(() => authStore.setUser(null), []);

  return {
    user,
    isAuthenticated: user !== null,
    logout,
  };
}
