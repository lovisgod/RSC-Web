import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart2,
  ClipboardList,
  LogOut,
  Menu,
  Settings,
  Store,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { RouteNotFound } from "@rsc/ui";

import { Toaster } from "./components/toaster";
import { InstallAppButton } from "./components/install-app-button";
import { useAuth } from "./hooks/use-auth";
import { useIdleLogout } from "./hooks/use-idle-logout";
import { useNewOrderAlert } from "./hooks/use-new-order-alert";
import { useOrdersQueue } from "./hooks/use-orders-queue";
import { useOutletRealtime } from "./hooks/use-outlet-realtime";
import { useOutletInfo } from "./hooks/use-outlet-info";
import { useProfile } from "./hooks/use-profile";
import { isActiveQueueOrder, logout as apiLogout } from "./lib/api";
import { toastBus } from "./lib/toast-bus";
import { ActiveOrdersPage } from "./pages/active-orders-page";
import { EarningsPage } from "./pages/earnings-page";
import { LoginPage } from "./pages/login-page";
import { MenuPage } from "./pages/menu-page";
import { SettingsPage } from "./pages/settings-page";

const navigation = [
  { label: "Active Orders", to: "/", icon: ClipboardList },
  { label: "Menu Control", to: "/menu", icon: UtensilsCrossed },
  { label: "Earnings & Payouts", to: "/earnings", icon: BarChart2 },
] as const;

interface NavigationPanelProps {
  onNavigate?: () => void;
}

function Brand() {
  return (
    <div className="px-1">
      <p className="m-0 text-xl font-black tracking-tight text-[var(--rsc-panel)]">
        RSC <span className="text-[var(--rsc-brand-light)]">Outlet Admin</span>
      </p>
      <p className="mt-1 text-xs font-medium text-white/50">Outlet operations</p>
    </div>
  );
}

function OutletIdentity() {
  const { user } = useAuth();
  const { data: outlet } = useOutletInfo(user?.outletId ?? "");
  const outletName = outlet?.name ?? (user?.outletId ? "My Outlet" : "No outlet assigned");

  return (
    <div
      className="relative mt-5 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-3"
      aria-label={`Current outlet: ${outletName}`}
    >
      <span
        className="absolute right-3 top-3 h-2 w-2 rounded-full bg-emerald-400"
        aria-hidden="true"
      />
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
        style={{ backgroundColor: "var(--rsc-main)", color: "var(--rsc-panel)" }}
        aria-hidden="true"
      >
        <Store size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-[var(--rsc-panel)]">
          {outletName}
        </span>
      </span>
    </div>
  );
}

function StaffFooter({ onNavigate }: NavigationPanelProps) {
  const { user, logout } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await apiLogout();
    } catch {
      // Clear local state even when the server session has already expired.
    } finally {
      queryClient.clear();
      logout();
      toastBus.emit("Signed out", "info");
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="mt-auto border-t border-white/10 pt-4">
      <div className="flex items-center gap-3 rounded-xl px-2 py-2">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            [
              "grid h-9 w-9 shrink-0 place-items-center rounded-lg transition",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
              "focus-visible:outline-[var(--rsc-brand-light)]",
              isActive ? "bg-[var(--rsc-brand)]" : "bg-white/10 hover:bg-white/15",
            ].join(" ")
          }
          style={{ color: "var(--rsc-panel)" }}
          aria-label="Open settings"
          title="Settings"
        >
          <Settings size={17} aria-hidden="true" />
        </NavLink>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold text-[var(--rsc-panel)]">
            {profile?.name ?? "Outlet staff"}
          </span>
          <span className="block truncate text-[11px] text-white/50">
            {profile?.role ?? user?.role ?? "Staff"}
          </span>
        </span>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          aria-label={isLoggingOut ? "Signing out" : "Sign out"}
          title="Sign out"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--rsc-panel)] transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rsc-brand-light)] disabled:cursor-wait disabled:opacity-40"
          style={{ color: "var(--rsc-panel)" }}
        >
          <LogOut size={17} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function NavigationPanel({ onNavigate }: NavigationPanelProps) {
  const { user } = useAuth();
  const { data: orders = [] } = useOrdersQueue(user?.outletId ?? "");
  const activeOrderCount = orders.filter(isActiveQueueOrder).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Brand />
      <OutletIdentity />

      <div className="mt-7 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
        Workspace
      </div>

      <nav aria-label="Outlet navigation" className="mt-2 flex flex-col gap-1">
        {navigation.map(({ icon: Icon, label, to }) => (
          <NavLink
            end={to === "/"}
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                "group flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold",
                "transition-colors focus-visible:outline focus-visible:outline-2",
                "focus-visible:outline-offset-2 focus-visible:outline-[var(--rsc-brand-light)]",
                isActive ? "shadow-sm" : "hover:bg-white/10",
              ].join(" ")
            }
            style={({ isActive }) => ({
              backgroundColor: isActive ? "var(--rsc-brand)" : "transparent",
              color: "var(--rsc-panel)",
            })}
          >
            {({ isActive }) => (
              <>
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors"
                  style={{
                    backgroundColor: isActive ? "rgb(255 255 255 / 0.14)" : "transparent",
                    color: "var(--rsc-panel)",
                  }}
                  aria-hidden="true"
                >
                  <Icon size={18} strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1 truncate" style={{ color: "var(--rsc-panel)" }}>
                  {label}
                </span>
                {to === "/" && activeOrderCount > 0 && (
                  <span
                    className="grid h-5 min-w-[1.25rem] shrink-0 place-items-center rounded-full px-1 text-[10px] font-bold"
                    style={{
                      backgroundColor: isActive ? "rgb(255 255 255 / 0.2)" : "var(--rsc-brand)",
                      color: "var(--rsc-panel)",
                    }}
                  >
                    {activeOrderCount}
                  </span>
                )}
                {isActive && activeOrderCount === 0 && (
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: "var(--rsc-panel)" }}
                    aria-hidden="true"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <StaffFooter {...(onNavigate ? { onNavigate } : {})} />
    </div>
  );
}

function OutletOrderNotifier() {
  const { user } = useAuth();
  const outletId = user?.outletId ?? "";
  const { data: orders = [] } = useOrdersQueue(outletId);
  const activeOrders = orders.filter(isActiveQueueOrder);

  useNewOrderAlert(activeOrders);

  return null;
}

function AppShell() {
  useIdleLogout();

  const { user } = useAuth();
  useOutletRealtime(user?.outletId ?? "");

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isDesktopNavVisible, setIsDesktopNavVisible] = useState(true);
  const location = useLocation();
  const currentRoute = navigation.find(({ to }) => to === location.pathname);
  const pageTitle =
    location.pathname === "/settings" ? "Settings" : (currentRoute?.label ?? "Outlet Admin");

  useEffect(() => {
    if (!isMobileNavOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMobileNavOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isMobileNavOpen]);

  return (
    <div className="flex h-screen min-h-0 bg-[var(--rsc-surface)]">
      <OutletOrderNotifier />
      {isDesktopNavVisible && (
        <aside
          className="hidden w-72 shrink-0 flex-col border-r border-white/10 px-4 py-6 md:flex"
          style={{ backgroundColor: "var(--rsc-navy-dark)" }}
        >
          <NavigationPanel />
        </aside>
      )}

      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 h-full w-full cursor-default bg-black/60"
            onClick={() => setIsMobileNavOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Outlet navigation"
            className="absolute left-0 top-0 flex h-dvh w-[80vw] flex-col px-4 py-5 shadow-2xl"
            style={{ backgroundColor: "var(--rsc-navy-dark)" }}
          >
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-lg text-white/65 transition hover:bg-white/10 hover:text-[var(--rsc-panel)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--rsc-brand-light)]"
            >
              <X size={20} aria-hidden="true" />
            </button>
            <NavigationPanel onNavigate={() => setIsMobileNavOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 px-4 md:px-6"
          style={{ backgroundColor: "var(--rsc-navy-dark)" }}
        >
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-lg text-[var(--rsc-panel)] transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--rsc-brand-light)] md:hidden"
            onClick={() => setIsMobileNavOpen(true)}
            aria-label="Open navigation"
            aria-expanded={isMobileNavOpen}
          >
            <Menu size={21} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="hidden h-10 w-10 place-items-center rounded-lg text-[var(--rsc-panel)] transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--rsc-brand-light)] md:grid"
            onClick={() => setIsDesktopNavVisible((visible) => !visible)}
            aria-label={isDesktopNavVisible ? "Hide navigation" : "Show navigation"}
            aria-expanded={isDesktopNavVisible}
            title={isDesktopNavVisible ? "Hide navigation" : "Show navigation"}
          >
            <Menu size={21} aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <p className="m-0 truncate text-sm font-bold text-[var(--rsc-panel)]">{pageTitle}</p>
            <p className="m-0 mt-0.5 hidden text-[11px] text-white/45 sm:block">
              DineOut Outlet Admin
            </p>
          </div>
          <InstallAppButton />
          {/* <ThemeToggle className="ml-auto" /> */}
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-[var(--rsc-panel)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function ProtectedShell() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppShell />;
}

export function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedShell />}>
          <Route index element={<ActiveOrdersPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="earnings" element={<EarningsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route
            path="*"
            element={
              <RouteNotFound
                eyebrow="404 · Outlet Admin"
                title="This outlet route does not exist"
                description="That link is not part of this outlet workspace. Return to the queue or jump back to menu control."
                primaryAction={{ label: "Go to active orders", href: "/" }}
                secondaryAction={{ label: "Menu control", href: "/menu" }}
              />
            }
          />
        </Route>
      </Routes>
      <Toaster />
    </>
  );
}
