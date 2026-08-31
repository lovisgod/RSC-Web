"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  Heart,
  Home,
  LogIn,
  LogOut,
  MapPin,
  Receipt,
  ShoppingBag,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";

import { cartItemCount } from "@/src/lib/data/cart";
import { useCartStore } from "@/src/stores/cart-store";
import { useAuthStore } from "@/src/stores/auth-store";
import { apiClient } from "@/src/lib/api";
import { BrandLogo } from "@/src/components/shared/brand-logo";
import { ThemeToggle } from "@rsc/ui";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon | string;
}

const navItems: NavItem[] = [
  { href: "/outlets", icon: Home, label: "Home" },
  { href: "/orders", icon: Receipt, label: "Orders" },
  { href: "/cart", icon: ShoppingBag, label: "Cart" },
  { href: "/favorites", icon: Heart, label: "Favourites" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/tracking", icon: MapPin, label: "Tracking" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function SideNav() {
  const pathname = usePathname();
  const itemCount = useCartStore((s) => cartItemCount(s.cart));
  const releaseCartOwner = useCartStore((s) => s.releaseActiveSessionOwner);
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const signOut = useAuthStore((s) => s.signOut);

  async function handleLogout() {
    try {
      await apiClient.logout();
    } catch {
      // proceed with local sign-out even if the API call fails
    }
    releaseCartOwner();
    signOut();
    // window.location.replace does a full-page navigation that replaces the
    // current history entry — authenticated pages can no longer be reached
    // by pressing back.
    window.location.replace("/sign-in");
  }

  return (
    <aside
      className="hidden h-screen w-60 flex-shrink-0 flex-col md:flex"
      style={{ backgroundColor: "var(--rsc-sidebar-bg)" }}
    >
      {/* Brand */}
      <div className="border-b px-6 py-4" style={{ borderColor: "var(--rsc-sidebar-border)" }}>
        <Link href="/outlets" className="inline-flex" aria-label="DineOut NG home">
          <BrandLogo className="web-sidebar-logo w-28" mode="dark" priority />
        </Link>
        <p className="text-xs" style={{ color: "var(--rsc-sidebar-muted)" }}>
          Your kitchen companion
        </p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive ? "var(--rsc-sidebar-active-bg)" : "transparent",
                color: isActive ? "var(--rsc-sidebar-ink)" : "var(--rsc-sidebar-muted)",
              }}
              onMouseEnter={(event) => {
                if (!isActive)
                  event.currentTarget.style.backgroundColor = "var(--rsc-sidebar-hover-bg)";
                event.currentTarget.style.color = "var(--rsc-sidebar-ink)";
              }}
              onMouseLeave={(event) => {
                if (!isActive) event.currentTarget.style.backgroundColor = "transparent";
                event.currentTarget.style.color = isActive
                  ? "var(--rsc-sidebar-ink)"
                  : "var(--rsc-sidebar-muted)";
              }}
            >
              {typeof item.icon === "string" ? (
                item.icon.startsWith("/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.icon} alt={item.label} className="w-5 h-5 object-contain" />
                ) : (
                  <span className="text-lg leading-none">{item.icon}</span>
                )
              ) : (
                <item.icon className="w-5 h-5" />
              )}
              <span>{item.label}</span>

              {/* Cart badge */}
              {item.label === "Cart" && itemCount > 0 && (
                <span
                  className="ml-auto min-w-[20px] h-5 flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
                  style={{ backgroundColor: "var(--rsc-brand)" }}
                >
                  {itemCount}
                </span>
              )}

              {/* Active indicator */}
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                  style={{ backgroundColor: "var(--rsc-brand)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div
        className="border-t px-3 py-4 flex items-center justify-between gap-2"
        style={{ borderColor: "var(--rsc-sidebar-border)" }}
      >
        {isSignedIn && (
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sign out"
            className="flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
            style={{ color: "var(--rsc-sidebar-muted)" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor = "var(--rsc-sidebar-hover-bg)";
              event.currentTarget.style.color = "var(--rsc-sidebar-ink)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = "transparent";
              event.currentTarget.style.color = "var(--rsc-sidebar-muted)";
            }}
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            <span>Logout</span>
          </button>
        )}
        <ThemeToggle className="shrink-0" />
      </div>
    </aside>
  );
}

interface SideNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SideNavDrawer({ isOpen, onClose }: SideNavDrawerProps) {
  const pathname = usePathname();
  const itemCount = useCartStore((s) => cartItemCount(s.cart));
  const releaseCartOwner = useCartStore((s) => s.releaseActiveSessionOwner);
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const signOut = useAuthStore((s) => s.signOut);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  async function handleLogout() {
    try {
      await apiClient.logout();
    } catch {
      // proceed with local sign-out even if the API call fails
    }
    releaseCartOwner();
    signOut();
    onClose();
    window.location.replace("/sign-in");
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        className="relative flex flex-col w-72 max-w-[85vw] h-full shadow-2xl z-10 transition-transform duration-300 ease-out"
        style={{ backgroundColor: "var(--rsc-sidebar-bg)" }}
      >
        {/* Header with Brand & Close Button */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--rsc-sidebar-border)" }}
        >
          <div>
            <Link
              href="/outlets"
              onClick={onClose}
              className="inline-flex"
              aria-label="DineOut NG home"
            >
              <BrandLogo className="web-sidebar-logo w-28" mode="dark" priority />
            </Link>
            <p className="text-xs mt-0.5" style={{ color: "var(--rsc-sidebar-muted)" }}>
              Your kitchen companion
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: isActive ? "var(--rsc-sidebar-active-bg)" : "transparent",
                  color: isActive ? "var(--rsc-sidebar-ink)" : "var(--rsc-sidebar-muted)",
                }}
              >
                {typeof item.icon === "string" ? (
                  <span className="text-lg leading-none">{item.icon}</span>
                ) : (
                  <item.icon className="w-5 h-5" />
                )}
                <span>{item.label}</span>

                {/* Cart badge */}
                {item.label === "Cart" && itemCount > 0 && (
                  <span
                    className="ml-auto min-w-[20px] h-5 flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
                    style={{ backgroundColor: "var(--rsc-brand)" }}
                  >
                    {itemCount}
                  </span>
                )}

                {/* Active indicator */}
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                    style={{ backgroundColor: "var(--rsc-brand)" }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div
          className="border-t px-3.5 py-4 flex items-center justify-between gap-2"
          style={{ borderColor: "var(--rsc-sidebar-border)" }}
        >
          {isSignedIn ? (
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              className="flex flex-1 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
              style={{ color: "var(--rsc-sidebar-muted)" }}
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
              <span>Logout</span>
            </button>
          ) : (
            <Link
              href="/sign-in"
              onClick={onClose}
              className="flex flex-1 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/5 text-emerald-400"
            >
              <LogIn className="h-5 w-5" aria-hidden="true" />
              <span>Sign In</span>
            </Link>
          )}
          <ThemeToggle className="shrink-0" />
        </div>
      </div>
    </div>
  );
}
