import {
  ChevronDown,
  ChevronRight,
  Banknote,
  ClipboardList,
  Bike,
  Gauge,
  History,
  LogOut,
  Megaphone,
  Menu,
  Settings,
  Store,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import { RouteNotFound } from "@rsc/ui";
import { useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { Toaster } from "./components/toaster";
import { useAdminRealtime } from "./hooks/use-admin-realtime";
import { useLiveClock } from "./hooks/use-live-clock";
import { useAuth } from "./hooks/use-auth";
import { logout as apiLogout } from "./lib/api";
import { AuditLogsPage } from "./pages/audit-logs-page";
import { toastBus } from "./lib/toast-bus";
import { DashboardPage } from "./pages/dashboard-page";
import { FinancialReconciliationPage } from "./pages/financial-reconciliation-page";
import { ForgotPasswordPage } from "./pages/forgot-password-page";
import { LoginPage } from "./pages/login-page";
import { OrdersFeedPage } from "./pages/orders-feed-page";
import { OwnerBackupsPage } from "./pages/owner-backups-page";
import { OutletControlPage } from "./pages/outlet-control-page";
import { OutletDetailPage } from "./pages/outlet-detail-page";
import { PromotionsPage } from "./pages/promotions-page";
import { RegisterPage } from "./pages/register-page";
import { ResetPasswordPage } from "./pages/reset-password-page";
import { RiderReportsPage } from "./pages/rider-reports-page";
import { RefundsPage } from "./pages/refunds-page";
import { SettingsPage } from "./pages/settings-page";
import { VerifyPage } from "./pages/verify-page";

const navigation = [
  { label: "Platform Live Board", to: "/", icon: Gauge },
  { label: "Orders Feed", to: "/orders", icon: ClipboardList },
  {
    label: "Outlet & Platform Control",
    icon: SlidersHorizontal,
    children: [
      { label: "Outlet Management", to: "/outlets", icon: Store },
      { label: "Platform Control", to: "/platform-control", icon: Settings },
    ],
  },
  { label: "Rider Reports", to: "/riders", icon: Bike },
  {
    label: "Financial Reconciliation",
    icon: Wallet,
    children: [
      { label: "Reconciliation & Payouts Ledger", to: "/finance", icon: Wallet },
      { label: "Refund Operation", to: "/finance/refunds", icon: Banknote },
    ],
  },
  { label: "Promotions Composer", to: "/promotions", icon: Megaphone },
  { label: "Audit Logs", to: "/audit-logs", icon: History },
] as const;

const routeTitles: Record<string, string> = {
  "/": "Platform Live Board",
  "/orders": "Platform Orders Feed",
  "/outlets": "Outlet Management",
  "/platform-control": "Platform Control",
  "/riders": "Rider Performance Reports",
  "/finance": "Reconciliation & Payouts Ledger",
  "/finance/refunds": "Refund Operation",
  "/promotions": "Promotions Push Composer",
  "/audit-logs": "Audit Logs",
  "/owner/backups": "Database Backups",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  if (routeTitles[pathname]) return routeTitles[pathname];
  if (pathname.startsWith("/outlets/")) return "Outlet Details";
  return "DineOut NG Central";
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<string>>(() => new Set());

  return (
    <>
      <nav aria-label="Central operations">
        {navigation.map((item) => {
          const Icon = item.icon;

          if ("children" in item) {
            const isGroupActive =
              item.children.some(({ to }) => location.pathname === to) ||
              (item.label === "Outlet & Platform Control" &&
                location.pathname.startsWith("/outlets/"));
            const isCollapsed = collapsedGroups.has(item.label);
            const isGroupOpen = isGroupActive && !isCollapsed;
            const defaultChild = item.children[0];

            return (
              <div className="sidebar-nav-group" key={item.label}>
                <button
                  type="button"
                  aria-expanded={isGroupOpen}
                  className={`sidebar-nav-parent${isGroupActive ? " active" : ""}`}
                  onClick={() => {
                    if (!isGroupActive) {
                      setCollapsedGroups((current) => {
                        const next = new Set(current);
                        next.delete(item.label);
                        return next;
                      });
                      navigate(defaultChild.to);
                      onNavigate?.();
                      return;
                    }

                    setCollapsedGroups((current) => {
                      const next = new Set(current);
                      if (next.has(item.label)) {
                        next.delete(item.label);
                      } else {
                        next.add(item.label);
                      }
                      return next;
                    });
                  }}
                >
                  <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
                  <span>{item.label}</span>
                  <ChevronDown className="nav-chevron" aria-hidden="true" size={15} />
                </button>
                {isGroupOpen && (
                  <div className="sidebar-nav-children">
                    {item.children.map(({ icon: ChildIcon, label, to }) => (
                      <NavLink
                        end={to === "/platform-control" || to === "/finance"}
                        key={to}
                        to={to}
                        onClick={onNavigate}
                      >
                        <ChildIcon aria-hidden="true" size={17} strokeWidth={1.8} />
                        <span>{label}</span>
                        <ChevronRight className="nav-chevron" aria-hidden="true" size={15} />
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink end={item.to === "/"} key={item.to} to={item.to} onClick={onNavigate}>
              <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
              <span>{item.label}</span>
              <ChevronRight className="nav-chevron" aria-hidden="true" size={15} />
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar__footer">
        <OperatorFooter />
      </div>
    </>
  );
}

function OperatorFooter() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await apiLogout();
    } catch {
      // Session may already be expired (401) or server unreachable —
      // always clear local state regardless.
    } finally {
      queryClient.clear(); // Prevent stale data leaking to the next session
      logout(); // Clear authStore + localStorage
      toastBus.emit("Signed out successfully", "info");
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="operator">
      {/* <span className="operator__avatar">{user?.role?.charAt(0) ?? "A"}</span> */}
      <button
        type="button"
        className="operator-settings-btn"
        aria-label="Open settings"
        title="Settings"
        onClick={() => navigate("/settings")}
      >
        <Settings aria-hidden="true" size={19} />
      </button>
      <span>
        <strong>{user?.role ?? "Admin"}</strong>
        {/* <small>Platform access</small> */}
      </span>
      <button
        type="button"
        className="logout-btn"
        aria-label="Sign out"
        disabled={isLoggingOut}
        onClick={handleLogout}
      >
        <LogOut size={isLoggingOut ? 14 : 16} className={isLoggingOut ? "spin" : ""} />
      </button>
    </div>
  );
}

function AdminShell() {
  useAdminRealtime();

  const location = useLocation();
  const clock = useLiveClock();
  const pageTitle = getPageTitle(location.pathname);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className={`admin-shell${sidebarOpen ? "" : " admin-shell--collapsed"}`}>
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="admin-brand">
          <span className="admin-brand__mark">R</span>
          <span>
            <strong>DineOut NG</strong>
            <small>Central operations</small>
          </span>
        </div>
        <SidebarNav />
      </aside>

      {/* Mobile floating hamburger */}
      <button
        className="mobile-hamburger"
        type="button"
        aria-label="Open navigation"
        onClick={() => setMobileNavOpen(true)}
      >
        <Menu aria-hidden="true" size={22} />
      </button>

      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div className="mobile-nav-overlay" onClick={() => setMobileNavOpen(false)}>
          <aside className="mobile-nav-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-nav-drawer__head">
              <div className="admin-brand" style={{ margin: 0 }}>
                <span className="admin-brand__mark">D</span>
                <span>
                  <strong>DineOut NG</strong>
                  <small>Central operations</small>
                </span>
              </div>
              <button
                className="mobile-nav-close"
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileNavOpen(false)}
              >
                ✕
              </button>
            </div>
            <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="admin-main">
        <header className="topbar">
          <div className="topbar__left">
            <button
              className="icon-button"
              type="button"
              aria-label={sidebarOpen ? "Collapse navigation" : "Expand navigation"}
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen((o) => !o)}
            >
              <Menu aria-hidden="true" size={20} />
            </button>
            <span className="topbar-title">{pageTitle}</span>
          </div>
          <div className="topbar__actions">
            {/* <ThemeToggle /> */}
            <span className="topbar-clock">{clock}</span>
          </div>
        </header>

        <div className="admin-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/orders" element={<OrdersFeedPage />} />
            <Route path="/outlets" element={<OutletControlPage view="outlets" />} />
            <Route path="/platform-control" element={<OutletControlPage view="platform" />} />
            <Route path="/outlets/:id" element={<OutletDetailPage />} />
            <Route path="/riders" element={<RiderReportsPage />} />
            <Route path="/finance" element={<FinancialReconciliationPage />} />
            <Route path="/finance/refunds" element={<RefundsPage />} />
            <Route path="/promotions" element={<PromotionsPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
            <Route path="/owner/backups" element={<OwnerBackupsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route
              path="*"
              element={
                <RouteNotFound
                  eyebrow="404 · DineOut NG Central"
                  title="This admin route is not available"
                  description="The page may have moved, or this central operations workspace does not include that route."
                  primaryAction={{ label: "Go to live board", href: "/" }}
                  secondaryAction={{ label: "View orders feed", href: "/orders" }}
                />
              }
            />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/*"
          element={
            <AuthGuard>
              <AdminShell />
            </AuthGuard>
          }
        />
      </Routes>
      <Toaster />
    </>
  );
}
