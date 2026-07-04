import {
  ChevronRight,
  ClipboardList,
  Gauge,
  LogOut,
  Megaphone,
  Menu,
  Settings,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { Toaster } from "./components/toaster";
import { useLiveClock } from "./hooks/use-live-clock";
import { useAuth } from "./hooks/use-auth";
import { logout as apiLogout } from "./lib/api";
import { toastBus } from "./lib/toast-bus";
import { DashboardPage } from "./pages/dashboard-page";
import { FinancialReconciliationPage } from "./pages/financial-reconciliation-page";
import { ForgotPasswordPage } from "./pages/forgot-password-page";
import { LoginPage } from "./pages/login-page";
import { OrdersFeedPage } from "./pages/orders-feed-page";
import { OutletControlPage } from "./pages/outlet-control-page";
import { OutletDetailPage } from "./pages/outlet-detail-page";
import { PromotionsPage } from "./pages/promotions-page";
import { RegisterPage } from "./pages/register-page";
import { ResetPasswordPage } from "./pages/reset-password-page";
import { VerifyPage } from "./pages/verify-page";

const navigation = [
  { label: "Platform Live Board", to: "/", icon: Gauge },
  { label: "Orders Feed", to: "/orders", icon: ClipboardList },
  { label: "Outlet & Platform Control", to: "/outlets", icon: SlidersHorizontal },
  { label: "Financial Reconciliation", to: "/finance", icon: Wallet },
  { label: "Promotions Composer", to: "/promotions", icon: Megaphone },
] as const;

const routeTitles: Record<string, string> = {
  "/": "Platform Live Board",
  "/orders": "Platform Orders Feed",
  "/outlets": "Outlet & System Control",
  "/finance": "Reconciliation & Payouts Ledger",
  "/promotions": "Promotions Push Composer",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  if (routeTitles[pathname]) return routeTitles[pathname];
  if (pathname.startsWith("/outlets/")) return "Outlet Details";
  return "RSC Central";
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <nav aria-label="Central operations">
        {navigation.map(({ icon: Icon, label, to }) => (
          <NavLink end={to === "/"} key={to} to={to} onClick={onNavigate}>
            <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
            <span>{label}</span>
            <ChevronRight className="nav-chevron" aria-hidden="true" size={15} />
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <OperatorFooter {...(onNavigate ? { onNavigate } : {})} />
      </div>
    </>
  );
}

function OperatorFooter({ onNavigate }: { onNavigate?: () => void }) {
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
      <NavLink to="/settings" onClick={onNavigate}>
        <Settings aria-hidden="true" size={19} />
        {/* <span>Settings</span> */}
      </NavLink>
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
            <strong>RSC</strong>
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
                <span className="admin-brand__mark">R</span>
                <span>
                  <strong>RSC</strong>
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
          <span className="topbar-clock">{clock}</span>
        </header>

        <div className="admin-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/orders" element={<OrdersFeedPage />} />
            <Route path="/outlets" element={<OutletControlPage />} />
            <Route path="/outlets/:id" element={<OutletDetailPage />} />
            <Route path="/finance" element={<FinancialReconciliationPage />} />
            <Route path="/promotions" element={<PromotionsPage />} />
            <Route
              path="/settings"
              element={
                <div className="placeholder">
                  <h1>Settings</h1>
                </div>
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
