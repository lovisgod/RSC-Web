export interface AuthUser {
  id: string;
  role: string;
}

const LS_KEY = "rsc:admin:auth";

function readStorage(): AuthUser | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

let current: AuthUser | null = readStorage();
const listeners = new Set<() => void>();

export const authStore = {
  getUser: () => current,
  isAuthenticated: () => current !== null,

  setUser(user: AuthUser | null) {
    current = user;
    if (user) {
      localStorage.setItem(LS_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LS_KEY);
    }
    listeners.forEach((fn) => fn());
  },

  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
