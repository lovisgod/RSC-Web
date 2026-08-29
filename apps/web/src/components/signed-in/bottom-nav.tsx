"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart as HeartIcon,
  Home as HomeIcon,
  Receipt as ReceiptIcon,
  ShoppingBag as ShoppingBagIcon,
  User as UserIcon,
} from "lucide-react";

import { cartItemCount } from "@/src/lib/data/cart";
import { useCartStore } from "@/src/stores/cart-store";

const navItems = [
  { href: "/outlets", icon: HomeIcon, label: "Home" },
  { href: "/orders", icon: ReceiptIcon, label: "Orders" },
  { href: "/cart", icon: ShoppingBagIcon, label: "Cart" },
  { href: "/favorites", icon: HeartIcon, label: "Favourites" },
  { href: "/profile", icon: UserIcon, label: "Account" },
];

export function BottomNav() {
  const pathname = usePathname();
  const itemCount = useCartStore((s) => cartItemCount(s.cart));

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 md:hidden"
      style={{
        backgroundColor: "var(--rsc-bottom-nav-bg)",
        borderColor: "var(--rsc-sidebar-border)",
        boxShadow: "0 -18px 40px color-mix(in srgb, var(--rsc-main) 12%, transparent)",
      }}
      aria-label="Primary mobile navigation"
    >
      <div className="mx-auto flex max-w-md items-end justify-around gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const isPrimaryAction = item.href === "/cart";
          const isElevated = isPrimaryAction;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className="group relative flex min-w-0 flex-1 flex-col items-center justify-end gap-1 rounded-2xl px-1 py-1.5 text-xs font-black transition-colors"
              style={{
                backgroundColor:
                  isActive && !isPrimaryAction ? "var(--rsc-sidebar-active-bg)" : "transparent",
                color: isActive ? "var(--rsc-brand)" : "var(--rsc-sidebar-muted)",
              }}
            >
              <span
                className={`relative grid place-items-center transition-all ${
                  isElevated
                    ? "-mt-7 h-14 w-14 rounded-full shadow-[0_12px_28px_rgba(0,177,79,0.4)]"
                    : "h-8 w-8 rounded-xl group-hover:bg-[var(--rsc-sidebar-hover-bg)]"
                }`}
                style={{
                  backgroundColor: isElevated
                    ? "var(--rsc-brand)"
                    : isActive
                      ? "color-mix(in srgb, var(--rsc-brand) 10%, transparent)"
                      : "transparent",
                }}
              >
                <Icon
                  className={`${isElevated ? "h-6 w-6 text-white" : "h-5 w-5"} transition-transform`}
                  aria-hidden="true"
                />

                {item.href === "/cart" && itemCount > 0 && (
                  <span
                    className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-sm"
                    style={{ backgroundColor: "#ffcf1f", color: "#073b1f" }}
                  >
                    {itemCount}
                  </span>
                )}
              </span>

              <span
                className="max-w-full truncate text-[0.7rem] leading-none"
                style={{ color: isActive ? "var(--rsc-brand)" : "var(--rsc-sidebar-muted)" }}
              >
                {item.label}
              </span>

              {isActive && !isPrimaryAction ? (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full"
                  style={{ backgroundColor: "var(--rsc-brand)" }}
                />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
