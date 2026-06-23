"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Home", indicator: "🏠" },
    { href: "/dashboard/search", label: "Search", indicator: "🔍" },
    { href: "/dashboard/cart", label: "Cart", indicator: "🛒" },
    { href: "/dashboard/track", label: "Track", indicator: "📦" },
    { href: "/dashboard/profile", label: "Profile", indicator: "👤" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-rsc-panel border-t border-rsc-line shadow-[0_-4px_20px_rgba(0,0,0,0.05)] flex justify-between px-6 py-2.5 z-40 max-w-156 mx-auto rounded-t-2xl">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors duration-150"
          >
            <div
              className={`p-2 rounded-xl text-lg transition-all duration-200 ${
                isActive
                  ? "bg-rsc-brand/10 text-rsc-brand scale-105"
                  : "text-rsc-muted hover:text-rsc-ink"
              }`}
            >
              <span>{item.indicator}</span>
            </div>
            <span className={isActive ? "text-rsc-ink" : "text-rsc-muted"}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
