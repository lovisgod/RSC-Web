"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cartItemCount } from "@/src/lib/data/cart";
import { useCartStore } from "@/src/stores/cart-store";

const navItems = [
  { href: "/outlets", icon: "/icons/png/house_1f3e0.png", label: "Home" },
  { href: "/menu", icon: "/icons/png/magnifying-glass-tilted-left_1f50d.png", label: "Search" },
  { href: "/cart", icon: "/icons/png/shopping-cart_1f6d2.png", label: "Cart" },
  { href: "/tracking", icon: "/icons/png/round-pushpin_1f4cd.png", label: "Tracking" },
  { href: "/profile", icon: "/icons/png/bust-in-silhouette_1f464.png", label: "Profile" },
];

export function BottomNav() {
  const pathname = usePathname();
  const itemCount = useCartStore((s) => cartItemCount(s.cart));

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 py-1"
      style={{ backgroundColor: "var(--rsc-surface)" }}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            className={`relative flex items-center justify-center w-14 h-14 rounded-xl transition-colors ${
              isActive ? "bg-white/20" : "hover:bg-white/10"
            }`}
          >
            {item.icon.startsWith("/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.icon} alt={item.label} className="w-6 h-6 object-contain" />
            ) : (
              <span className="text-2xl leading-none">{item.icon}</span>
            )}

            {item.href === "/cart" && itemCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[10px] font-bold text-white px-0.5"
                style={{ backgroundColor: "var(--rsc-dark)" }}
              >
                {itemCount}
              </span>
            )}

            {isActive && (
              <span
                className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full"
                style={{ backgroundColor: "var(--rsc-dark)" }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
