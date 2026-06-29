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
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { Toaster } from "./components/toaster";
import { useLiveClock } from "./hooks/use-live-clock";
import { useAuth } from "./hooks/use-auth";
import { apiClient } from "./lib/api";
import { toastBus } from "./lib/toast-bus";
import { authStore } from "./stores/auth-store";
import { DashboardPage } from "./pages/dashboard-page";
import { FinancialReconciliationPage } from "./pages/financial-reconciliation-page";
import { LoginPage } from "./pages/login-page";
import { OrdersFeedPage } from "./pages/orders-feed-page";
import { OutletControlPage } from "./pages/outlet-control-page";
import { PromotionsPage } from "./pages/promotions-page";
import { RegisterPage } from "./pages/register-page";

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
        <NavLink to="/settings" onClick={onNavigate}>
          <Settings aria-hidden="true" size={19} />
          <span>Settings</span>
        </NavLink>
        <OperatorFooter />
      </div>
    </>
  );
}

function OperatorFooter() {
  const { user, logout } = useAuth();

  async function handleLogout() {
    try {
      await apiClient.logout();
    } catch {
      // Server-side session may already be gone; proceed anyway
    }
    logout();
    toastBus.emit("Signed out", "info");
  }

  return (
    <div className="operator">
      <span className="operator__avatar">{user?.role?.charAt(0) ?? "A"}</span>
      <span>
        <strong>{user?.role ?? "Admin"}</strong>
        <small>Platform access</small>
      </span>
      <button type="button" className="logout-btn" aria-label="Sign out" onClick={handleLogout}>
        <LogOut size={16} />
      </button>
    </div>
  );
}

function AdminShell() {
  const location = useLocation();
  const clock = useLiveClock();
  const pageTitle = routeTitles[location.pathname] ?? "RSC Central";
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
