import {
  BarChart3,
  Bell,
  ChevronRight,
  CircleDollarSign,
  CookingPot,
  LayoutDashboard,
  MapPinned,
  MenuSquare,
  Search,
  Settings,
  Store,
  Users,
} from "lucide-react";
import { NavLink, Route, Routes } from "react-router-dom";

import { DashboardPage } from "./pages/dashboard-page";
import { MenusPage } from "./pages/menus-page";
import { NotificationsPage } from "./pages/notifications-page";

const navigation = [
  { label: "Overview", to: "/", icon: LayoutDashboard },
  { label: "Orders", to: "/orders", icon: CookingPot },
  { label: "Menus", to: "/menus", icon: MenuSquare },
  { label: "Notifications", to: "/notifications", icon: Bell },
  { label: "Outlets", to: "/outlets", icon: Store },
  { label: "Settlements", to: "/settlements", icon: CircleDollarSign },
  { label: "Delivery", to: "/delivery", icon: MapPinned },
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "Team & access", to: "/team", icon: Users },
] as const;

function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="placeholder">
      <p className="kicker">Foundation route</p>
      <h1>{title}</h1>
      <p>This workflow is mapped in TODO.md and ready for an agent to implement.</p>
    </section>
  );
}

export function App() {
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="admin-brand">
          <span className="admin-brand__mark">R</span>
          <span>
            <strong>RSC</strong>
            <small>Central operations</small>
          </span>
        </div>

        <nav aria-label="Central operations">
          {navigation.map(({ icon: Icon, label, to }) => (
            <NavLink end={to === "/"} key={to} to={to}>
              <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
              <span>{label}</span>
              <ChevronRight className="nav-chevron" aria-hidden="true" size={15} />
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <NavLink to="/settings">
            <Settings aria-hidden="true" size={19} />
            <span>Settings</span>
          </NavLink>
          <div className="operator">
            <span className="operator__avatar">AO</span>
            <span>
              <strong>Admin operator</strong>
              <small>Platform access</small>
            </span>
          </div>
        </div>
      </aside>

      <div className="admin-main">
        <header className="topbar">
          <label className="search">
            <Search aria-hidden="true" size={18} />
            <span className="sr-only">Search orders and outlets</span>
            <input placeholder="Search orders, outlets, customers…" type="search" />
          </label>
          <button className="icon-button" type="button" aria-label="Notifications">
            <Bell aria-hidden="true" size={20} />
            <span className="notification-dot" />
          </button>
        </header>

        <div className="admin-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/menus" element={<MenusPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            {navigation
              .slice(1)
              .map(({ label, to }) =>
                to === "/menus" || to === "/notifications" ? null : (
                  <Route key={to} path={to} element={<PlaceholderPage title={label} />} />
                ),
              )}
            <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
