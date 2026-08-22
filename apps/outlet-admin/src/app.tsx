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
import { CssBrandLogo, RouteNotFound } from "@rsc/ui";

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
      <CssBrandLogo className="outlet-sidebar-logo" mode="dark" size="sm" />
    </div>
  );
}

function OutletIdentity() {
  const { user } = useAuth();
  const { data: outlet } = useOutletInfo(user?.outletId ?? "");
  const outletName = outlet?.name ?? (user?.outletId ? "My Outlet" : "No outlet assigned");
  const bannerUrl = outlet?.bannerUrl ?? null;
  const isOnline = outlet?.isOnline ?? false;

  return (
    <div
      className="relative mt-5 overflow-hidden rounded-2xl border border-[var(--rsc-sidebar-border)] bg-white/[0.08]"
      aria-label={`Current outlet: ${outletName}. Status: ${isOnline ? "online" : "offline"}`}
    >
      <span
        className={`absolute right-3 top-3 z-10 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--rsc-sidebar-bg)] ${
          isOnline ? "bg-emerald-400" : "bg-red-500"
        }`}
        aria-hidden="true"
      />
      {bannerUrl && (
        <div
          className="h-20 bg-cover bg-center"
          style={{ backgroundImage: `url("${bannerUrl}")` }}
          aria-hidden="true"
        >
          <div
            className="h-full"
            style={{
              background:
                "linear-gradient(to top, color-mix(in srgb, var(--rsc-sidebar-bg) 88%, transparent), color-mix(in srgb, var(--rsc-sidebar-bg) 32%, transparent), transparent)",
            }}
          />
        </div>
      )}
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
          style={{
            backgroundColor: "var(--rsc-brand-light)",
            color: "var(--rsc-sidebar-bg)",
          }}
          aria-hidden="true"
        >
          <Store size={17} />
        </span>
        <span className="min-w-0 flex-1">
          {bannerUrl ? (
            <span className="block truncate text-xs font-semibold text-[var(--rsc-sidebar-muted)]">
              Outlet workspace
            </span>
          ) : (
            <span className="block truncate text-sm font-bold text-[var(--rsc-sidebar-ink)]">
              {outletName}
            </span>
          )}
        </span>
      </div>
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
    <div className="mt-auto border-t border-[var(--rsc-sidebar-border)] pt-4">
      <div className="flex items-center gap-3 rounded-xl px-2 py-2">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            [
              "grid h-9 w-9 shrink-0 place-items-center rounded-lg transition",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
              "focus-visible:outline-[var(--rsc-brand-light)]",
              isActive
                ? "bg-[var(--rsc-sidebar-active-bg)]"
                : "bg-white/10 hover:bg-[var(--rsc-sidebar-hover-bg)]",
            ].join(" ")
          }
          style={{ color: "var(--rsc-sidebar-ink)" }}
          aria-label="Open settings"
          title="Settings"
        >
          <Settings size={17} aria-hidden="true" />
        </NavLink>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold text-[var(--rsc-sidebar-ink)]">
            {profile?.name ?? "Outlet staff"}
          </span>
          <span className="block truncate text-[11px] text-[var(--rsc-sidebar-muted)]">
            {profile?.role ?? user?.role ?? "Staff"}
          </span>
        </span>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          aria-label={isLoggingOut ? "Signing out" : "Sign out"}
          title="Sign out"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--rsc-sidebar-ink)] transition hover:bg-[var(--rsc-sidebar-hover-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rsc-brand-light)] disabled:cursor-wait disabled:opacity-40"
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

      <div className="mt-7 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--rsc-sidebar-muted)]">
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
                isActive ? "shadow-sm" : "hover:bg-[var(--rsc-sidebar-hover-bg)]",
              ].join(" ")
            }
            style={({ isActive }) => ({
              backgroundColor: isActive ? "var(--rsc-sidebar-active-bg)" : "transparent",
              color: "var(--rsc-sidebar-ink)",
            })}
          >
            {({ isActive }) => (
              <>
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors"
                  style={{
                    backgroundColor: isActive ? "rgb(255 255 255 / 0.14)" : "transparent",
                    color: "var(--rsc-sidebar-ink)",
                  }}
                  aria-hidden="true"
                >
                  <Icon size={18} strokeWidth={2} />
                </span>
                <span
                  className="min-w-0 flex-1 truncate"
                  style={{ color: "var(--rsc-sidebar-ink)" }}
                >
                  {label}
                </span>
                {to === "/" && activeOrderCount > 0 && (
                  <span
                    className="grid h-5 min-w-[1.25rem] shrink-0 place-items-center rounded-full px-1 text-[10px] font-bold"
                    style={{
                      backgroundColor: isActive ? "rgb(255 255 255 / 0.2)" : "var(--rsc-brand)",
                      color: "var(--rsc-sidebar-ink)",
                    }}
                  >
                    {activeOrderCount}
                  </span>
                )}
                {isActive && activeOrderCount === 0 && (
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: "var(--rsc-sidebar-ink)" }}
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
          className="hidden w-72 shrink-0 flex-col border-r border-[var(--rsc-sidebar-border)] px-4 py-6 md:flex"
          style={{ backgroundColor: "var(--rsc-sidebar-bg)" }}
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
            style={{ backgroundColor: "var(--rsc-sidebar-bg)" }}
          >
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-lg text-[var(--rsc-sidebar-muted)] transition hover:bg-[var(--rsc-sidebar-hover-bg)] hover:text-[var(--rsc-sidebar-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--rsc-brand-light)]"
            >
              <X size={20} aria-hidden="true" />
            </button>
            <NavigationPanel onNavigate={() => setIsMobileNavOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--rsc-sidebar-border)] px-4 md:px-6"
          style={{ backgroundColor: "var(--rsc-sidebar-bg)" }}
        >
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-lg text-[var(--rsc-sidebar-ink)] transition hover:bg-[var(--rsc-sidebar-hover-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--rsc-brand-light)] md:hidden"
            onClick={() => setIsMobileNavOpen(true)}
            aria-label="Open navigation"
            aria-expanded={isMobileNavOpen}
          >
            <Menu size={21} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="hidden h-10 w-10 place-items-center rounded-lg text-[var(--rsc-sidebar-ink)] transition hover:bg-[var(--rsc-sidebar-hover-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--rsc-brand-light)] md:grid"
            onClick={() => setIsDesktopNavVisible((visible) => !visible)}
            aria-label={isDesktopNavVisible ? "Hide navigation" : "Show navigation"}
            aria-expanded={isDesktopNavVisible}
            title={isDesktopNavVisible ? "Hide navigation" : "Show navigation"}
          >
            <Menu size={21} aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <p className="m-0 truncate text-sm font-bold text-[var(--rsc-sidebar-ink)]">
              {pageTitle}
            </p>
            <p className="m-0 mt-0.5 hidden text-[11px] text-[var(--rsc-sidebar-muted)] sm:block">
              DineOut NG Outlet Admin
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
