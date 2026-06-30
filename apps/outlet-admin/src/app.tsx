import {
  Bell,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  Megaphone,
  MenuSquare,
  Printer,
  Search,
  Settings,
  Truck,
  Users,
} from "lucide-react";
import { NavLink, Route, Routes } from "react-router-dom";

import { DashboardPage } from "./pages/dashboard-page";
import { MenusPage } from "./pages/menus-page";

const navigation = [
  { label: "Overview", to: "/", icon: LayoutDashboard },
  { label: "Orders", to: "/orders", icon: ClipboardList },
  { label: "Menus", to: "/menus", icon: MenuSquare },
  { label: "Riders", to: "/riders", icon: Truck },
  { label: "Customers", to: "/customers", icon: Users },
  { label: "Delivery zones", to: "/delivery", icon: MapPin },
  { label: "Promos", to: "/promos", icon: Megaphone },
] as const;

function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="placeholder">
      <p className="kicker">Outlet workflow</p>
      <h1>{title}</h1>
      <p>This route is scaffolded for the outlet admin app and ready for API-backed work.</p>
    </section>
  );
}

export function App() {
  return (
    <div className="outlet-shell">
      <aside className="sidebar">
        <div className="admin-brand">
          <span className="admin-brand__mark">R</span>
          <span>
            <strong>RSC Outlet</strong>
            <small>Fire &amp; Spice Lekki</small>
          </span>
        </div>

        <nav aria-label="Outlet operations">
          {navigation.map(({ icon: Icon, label, to }) => (
            <NavLink end={to === "/"} key={to} to={to}>
              <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
              <span>{label}</span>
              <ChevronRight className="nav-chevron" aria-hidden="true" size={15} />
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <NavLink to="/print-station">
            <Printer aria-hidden="true" size={19} />
            <span>Print station</span>
          </NavLink>
          <NavLink to="/settings">
            <Settings aria-hidden="true" size={19} />
            <span>Settings</span>
          </NavLink>
          <div className="operator">
            <span className="operator__avatar">OA</span>
            <span>
              <strong>Outlet admin</strong>
              <small>Outlet-scoped access</small>
            </span>
          </div>
        </div>
      </aside>

      <div className="admin-main">
        <header className="topbar">
          <label className="search">
            <Search aria-hidden="true" size={18} />
            <span className="sr-only">Search outlet orders and menu items</span>
            <input placeholder="Search orders, menu items, riders..." type="search" />
          </label>
          <div className="topbar__actions">
            <span className="service-status">Online</span>
            <button className="icon-button" type="button" aria-label="Notifications">
              <Bell aria-hidden="true" size={20} />
              <span className="notification-dot" />
            </button>
          </div>
        </header>

        <main className="admin-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/menus" element={<MenusPage />} />
            {navigation
              .slice(1)
              .map(({ label, to }) =>
                to === "/menus" ? null : (
                  <Route key={to} path={to} element={<PlaceholderPage title={label} />} />
                ),
              )}
            <Route path="/print-station" element={<PlaceholderPage title="Print station" />} />
            <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
