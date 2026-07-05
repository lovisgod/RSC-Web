"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cartItemCount } from "@/src/lib/data/cart";
import { useCartStore } from "@/src/stores/cart-store";
import { useAuthStore } from "@/src/stores/auth-store";
import { apiClient } from "@/src/lib/api";

const navItems = [
  { href: "/outlets", icon: "/icons/png/house_1f3e0.png", label: "Home" },
  { href: "/cart", icon: "/icons/png/shopping-cart_1f6d2.png", label: "Cart" },
  { href: "/tracking", icon: "/icons/png/round-pushpin_1f4cd.png", label: "Tracking" },
  { href: "/profile", icon: "/icons/png/bust-in-silhouette_1f464.png", label: "Profile" },
];

export function SideNav() {
  const pathname = usePathname();
  const itemCount = useCartStore((s) => cartItemCount(s.cart));
  const signOut = useAuthStore((s) => s.signOut);

  async function handleLogout() {
    try {
      await apiClient.logout();
    } catch {
      // proceed with local sign-out even if the API call fails
    }
    signOut();
    // window.location.replace does a full-page navigation that replaces the
    // current history entry — authenticated pages can no longer be reached
    // by pressing back.
    window.location.replace("/sign-in");
  }

  return (
    <aside
      className="hidden h-screen w-60 flex-shrink-0 flex-col md:flex"
      style={{ backgroundColor: "var(--rsc-main)" }}
    >
      {/* Brand */}
      <div className="px-6 py-6 border-b border-white/10">
        <Link href="/outlets" className="font-bold text-xl leading-none">
          <span className="text-white">RSC</span>
          <span style={{ color: "var(--rsc-dark)" }}> Food</span>
        </Link>
        <p className="text-white/40 text-xs mt-1">Your kitchen companion</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors relative ${
                isActive
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
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
                  style={{ backgroundColor: "var(--rsc-dark)" }}
                >
                  {itemCount}
                </span>
              )}

              {/* Active indicator */}
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                  style={{ backgroundColor: "var(--rsc-dark)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-5 border-t border-white/10">
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-3 w-full rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <span className="text-lg leading-none">🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
