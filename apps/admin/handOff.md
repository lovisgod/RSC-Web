# RSC Central — Admin App Handoff

Internal operations dashboard for RSC platform management. SUPER_ADMIN-only access.

---

## Tech Stack

| Concern           | Choice                                          |
| ----------------- | ----------------------------------------------- |
| Framework         | React 19 + Vite 8                               |
| Language          | TypeScript (strict)                             |
| Routing           | React Router v7                                 |
| Server state      | TanStack Query v5                               |
| HTTP client       | Axios 1.x                                       |
| UI primitives     | `@rsc/ui` (internal package)                    |
| Skeleton loading  | MUI `@mui/material` v9                          |
| Icons             | Lucide React                                    |
| Contracts / types | `@rsc/contracts` (Zod schemas + inferred types) |
| Monorepo          | pnpm workspaces                                 |

---

## Directory Structure

```
apps/admin/src/
├── main.tsx                  # App entry — QueryClient + BrowserRouter + StrictMode
├── app.tsx                   # Root routes, AuthGuard, AdminShell, SidebarNav
├── styles.css                # All admin-scoped CSS (no CSS modules)
│
├── lib/
│   ├── api.ts                # ★ Single source of truth for all API calls
│   └── toast-bus.ts          # Module-level event emitter for toasts outside React
│
├── stores/
│   └── auth-store.ts         # Module-level auth state (useSyncExternalStore pattern)
│
├── hooks/
│   ├── use-auth.ts           # Reads authStore via useSyncExternalStore
│   ├── use-live-clock.ts     # Ticking clock string for the topbar
│   ├── use-operations-stats.ts # GET /api/v1/stats/operations/* — 30s polling
│   ├── use-outlets-live.ts   # GET /api/v1/outlets — 15s polling
│   ├── use-toggle-outlet-status.ts  # PATCH /api/v1/outlets/:id
│   └── use-delete-outlet.ts  # DELETE /api/v1/outlets/:id
│
├── pages/
│   ├── login-page.tsx
│   ├── register-page.tsx
│   ├── verify-page.tsx
│   ├── forgot-password-page.tsx
│   ├── reset-password-page.tsx
│   ├── dashboard-page.tsx
│   ├── outlet-control-page.tsx
│   ├── orders-feed-page.tsx
│   ├── financial-reconciliation-page.tsx
│   └── promotions-page.tsx
│
└── components/
    ├── outlet-onboard-modal.tsx  # Add / Edit outlet (dual-mode)
    ├── toaster.tsx               # MUI Snackbar subscriber to toast-bus
    ├── password-input.tsx        # Input + show/hide toggle
    ├── otp-input.tsx             # 6-box OTP entry
    ├── page-heading.tsx
    ├── service-volume-chart.tsx
    └── operations-queue.tsx
```

---

## API Layer — `src/lib/api.ts`

**This is the only file that makes HTTP requests.** No page or hook should call `fetch` or `axios` directly.

### How it works

```
axios instance (http)
  └── request interceptor  → attaches withCredentials (cookies)
  └── response interceptor → unwraps errors into plain Error objects

Envelope helpers (internal)
  get<T>(path)           → http.get  → r.data.data
  post<T>(path, body)    → http.post → r.data.data
  patchReq<T>(path, body)→ http.patch→ r.data.data

All API responses follow the shape:
  { data: T, message: string, status: number }
The helpers unwrap data.data and return T directly.
```

### Adding a new endpoint

1. Add the function to `api.ts` using the existing helpers
2. Type the return value against a type from `@rsc/contracts`
3. Create a hook in `hooks/` that wraps `useQuery` or `useMutation`
4. Import the hook in the page — never import from `api.ts` directly in a page

```ts
// api.ts
export const listOrders = (): Promise<Order[]> => get("/api/v1/orders");

// hooks/use-orders.ts
export function useOrders() {
  return useQuery({ queryKey: ["admin", "orders"], queryFn: listOrders });
}
```

### Dev proxy

`VITE_API_BASE_URL` is intentionally **empty** in `.env.local`. All `/api/...` requests are proxied by Vite to `https://api-dev.rscdev.tech` (configured in `vite.config.ts`). This sidesteps cross-origin cookie restrictions in development.

**Always restart the dev server** after changing `vite.config.ts` or `.env.local`.

---

## Authentication

### Mechanism

HTTP-only cookies set by the API server. The browser handles them automatically — no manual token handling on the frontend.

### Auth store (`src/stores/auth-store.ts`)

A module-level singleton, not a React Context. Stores only display metadata: `{ id: string, role: string }`. Persists to `localStorage` under `rsc:admin:auth` so page refreshes don't log the user out.

```ts
authStore.setUser({ id, role }); // call on login success
authStore.setUser(null); // call on logout
```

### `useAuth` hook

Subscribes to `authStore` via `useSyncExternalStore` — any component calling this re-renders when auth state changes without needing a Provider.

### AuthGuard

Defined in `app.tsx`. Wraps all protected routes (`/*`). Redirects to `/login` if not authenticated.

```tsx
<Route
  path="/*"
  element={
    <AuthGuard>
      <AdminShell />
    </AuthGuard>
  }
/>
```

### Auth flow

```
Register → /api/v1/auth/register
  └── navigate to /verify with { email, phone, otpExpiresInSeconds, verificationChannels }

Verify OTP → /api/v1/auth/verify-user
  └── navigate to /login

Login → /api/v1/auth/login
  └── authStore.setUser({ id, role }) → AuthGuard lets user through

Forgot password → /api/v1/auth/forgot-password
  └── navigate to /reset-password with { identifier, otpExpiresInSeconds }

Reset password → /api/v1/auth/reset-password
  └── navigate to /login

Logout → /api/v1/auth/logout
  └── queryClient.clear() → authStore.setUser(null) → navigate /login
```

> **Important:** The Register page sends `role: "SUPER_ADMIN"` but the API may ignore this for the `/auth/register` endpoint and create a CUSTOMER account. Admin accounts must be seeded or created through an elevated endpoint. Always log in with an account that already has the SUPER_ADMIN role — verify the `role` field in `localStorage` after login.

---

## Server State — TanStack Query

### QueryClient (configured in `main.tsx`)

```ts
staleTime: 30_000; // data considered fresh for 30s — reduces redundant fetches
retry: 1; // one retry on failure before error state
refetchOnWindowFocus: false;
```

`QueryCache.onError` is wired to `toastBus` — any failed query automatically emits an error toast without any per-hook handling.

### Query key convention

All admin queries are namespaced under `["admin", ...]`:

```ts
["admin", "outlets"];
["admin", "stats", "operations", ...];
["admin", "orders"];
```

Invalidate after mutations:

```ts
queryClient.invalidateQueries({ queryKey: ["admin", "outlets"] });
```

### Real-time polling

| Hook                   | Interval   |
| ---------------------- | ---------- |
| `useOutletsLive`       | 15 seconds |
| `useOperationsSummary` | 30 seconds |
| `useOrderPulse`        | 30 seconds |
| `useOperationsQueue`   | 30 seconds |

---

## Toast System

Toast notifications work **outside React** (required for `QueryCache.onError`).

`toast-bus.ts` is a module-level event emitter:

```ts
toastBus.emit("Outlet updated", "success"); // from anywhere
toastBus.emit(err.message, "error");
// severities: "success" | "error" | "info" | "warning"
```

`<Toaster />` component (in `app.tsx`) subscribes to `toastBus` and renders MUI `Snackbar + Alert`. It sits outside the router so it catches all events regardless of route.

---

## Routing

```
/login              → LoginPage          (public)
/register           → RegisterPage       (public)
/verify             → VerifyPage         (public, requires router state)
/forgot-password    → ForgotPasswordPage (public)
/reset-password     → ResetPasswordPage  (public, requires router state)

/* (protected via AuthGuard → AdminShell)
  /                 → DashboardPage
  /orders           → OrdersFeedPage
  /outlets          → OutletControlPage
  /finance          → FinancialReconciliationPage
  /promotions       → PromotionsPage
  /settings         → placeholder
```

`/verify` and `/reset-password` use **React Router state** (passed via `navigate(..., { state: {...} })`). If that state is missing (e.g. user refreshes or navigates directly), they redirect back to the start of their respective flows. Never add URL params as an alternative — keep sensitive data (OTP expiry, identifier) out of the URL.

---

## Outlet Control Page — Key Patterns

### Optimistic toggle

Toggle flips `onlineState` in local state immediately, then fires the PATCH. On error it reverts:

```ts
setOnlineState((prev) => ({ ...prev, [outlet.id]: next })); // optimistic
toggleStatus(
  { outlet, isOnline: next },
  {
    onError: () => setOnlineState((prev) => ({ ...prev, [outlet.id]: current })), // revert
  },
);
```

### Double-tap to reveal edit/delete

Double-clicking an outlet card sets `deleteReadyId`. This adds `outlet-card--delete-ready` class, which CSS-transitions the `.outlet-card__side-actions` width from `0` to `80px`. A global `click` listener clears `deleteReadyId` when clicking outside any `.outlet-card`. Pressing `Escape` also clears it.

### Outlet modal (dual-mode)

`<OutletOnboardModal>` handles both add and edit via a single `outlet?` prop:

- `outlet = undefined` → modal closed
- `outlet = null` → add mode (POST `/api/v1/outlets`)
- `outlet = OutletSummary` → edit mode (PATCH `/api/v1/outlets/:id`)

---

## CSS Conventions

- **Single global stylesheet** at `src/styles.css` — no CSS modules, no Tailwind
- CSS custom properties are defined in `@rsc/ui/styles.css` (imported first in `main.tsx`)
- Key variables: `--rsc-navy-dark`, `--rsc-navy`, `--rsc-brand-orange`, `--rsc-radius`
- Mobile breakpoint: `760px` — sidebar and topbar are hidden below this; mobile hamburger and drawer take over
- Never hardcode colours that have a CSS variable equivalent

---

## Ground Rules

### Before adding a new page

1. Add a route in `app.tsx` inside `AdminShell`
2. Add the route title to `routeTitles` in `app.tsx`
3. Add a nav entry to the `navigation` array if it belongs in the sidebar

### Before adding a new API call

1. Add the function to `src/lib/api.ts` — nowhere else
2. Wrap it in a `useQuery` or `useMutation` hook in `src/hooks/`
3. Pages import hooks, never `api.ts` directly

### Mutations must

- Call `queryClient.invalidateQueries(...)` on success
- Call `toastBus.emit(...)` on both success and error
- Never show inline loading spinners beyond disabling the submit button

### Never

- Import `axios` or call `fetch` outside `src/lib/api.ts`
- Add a React Context for something a module-level store can handle
- Store the raw auth token in JavaScript-accessible storage — cookies only
- Push directly to `main` or `dev` — always branch from `dev`
- Skip restarting the dev server after changing `vite.config.ts` or `.env.local`

### Packages

- UI components → `@rsc/ui` first; only add MUI for things `@rsc/ui` doesn't cover (e.g. Skeleton)
- Types and Zod schemas → always from `@rsc/contracts`; never redeclare locally what already exists there
- Install new packages in `apps/admin` scope: `pnpm --filter @rsc/admin add <package>`

---

## Running Locally

```bash
# From monorepo root
pnpm --filter @rsc/admin dev

# App runs at:
http://127.0.0.1:5173

# API proxy target:
https://api-dev.rscdev.tech
```

`.env.local` holds `VITE_API_BASE_URL=` (empty). Requests to `/api/...` are proxied by Vite — do not change this to a direct URL or cross-origin cookie auth will break.
