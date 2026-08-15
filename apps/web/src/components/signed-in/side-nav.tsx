"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { usePathname } from "next/navigation";

import { cartItemCount } from "@/src/lib/data/cart";
import { useCartStore } from "@/src/stores/cart-store";
import { useAuthStore } from "@/src/stores/auth-store";
import { apiClient } from "@/src/lib/api";
import { BrandLogo } from "@/src/components/shared/brand-logo";

const navItems = [
  { href: "/outlets", icon: "/icons/png/house_1f3e0.png", label: "Home" },
  { href: "/cart", icon: "/icons/png/shopping-cart_1f6d2.png", label: "Cart" },
  { href: "/tracking", icon: "/icons/png/round-pushpin_1f4cd.png", label: "Tracking" },
  { href: "/profile", icon: "/icons/png/bust-in-silhouette_1f464.png", label: "Profile" },
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
          <BrandLogo className="web-sidebar-logo w-28" priority />
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
              {item.icon.startsWith("/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.icon} alt={item.label} className="w-5 h-5 object-contain" />
              ) : (
                <span className="text-lg leading-none">{item.icon}</span>
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

      {isSignedIn && (
        <div className="border-t px-3 py-5" style={{ borderColor: "var(--rsc-sidebar-border)" }}>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sign out"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors"
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
        </div>
      )}
    </aside>
  );
}
