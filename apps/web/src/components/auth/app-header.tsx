"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCartStore } from "@/src/stores/cart-store";

export function AppHeader() {
  const router = useRouter();
  const itemCount = useCartStore((s) => s.itemCount);
  const [query, setQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/outlets?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 grid grid-cols-3 items-center">
        {/* Left — Brand */}
        <div className="flex items-center">
          <Link href="/" className="font-bold text-lg leading-none whitespace-nowrap">
            <span style={{ color: "var(--rsc-main)" }}>RSC</span>
            <span style={{ color: "var(--rsc-dark)" }}> Food</span>
          </Link>
        </div>

        {/* Centre — Search (hidden on mobile) */}
        <div className="flex justify-center">
          <form onSubmit={handleSearch} className="hidden sm:flex w-full max-w-sm">
            <div className="relative w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/png/magnifying-glass-tilted-left_1f50d.png"
                alt="Search"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 object-contain opacity-40"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="search"
                placeholder="Search kitchens or dishes…"
                className="w-full pl-9 pr-4 py-2 rounded-full border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:border-[var(--rsc-main)] focus:outline-none transition-colors"
              />
            </div>
          </form>
        </div>

        {/* Right — Icons */}
        <div className="flex items-center justify-end gap-2">
          {/* Search icon — mobile only */}
          <Link
            href="/outlets"
            className="sm:hidden flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Search"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/png/magnifying-glass-tilted-left_1f50d.png"
              alt="Search"
              className="w-5 h-5 object-contain"
            />
          </Link>

          {/* Cart */}
          <Link
            href="/cart"
            className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="View cart"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/png/shopping-cart_1f6d2.png"
              alt="Cart"
              className="w-5 h-5 object-contain"
            />
            {itemCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[10px] font-bold text-white px-0.5"
                style={{ backgroundColor: "var(--rsc-dark)" }}
              >
                {itemCount}
              </span>
            )}
          </Link>

          {/* Profile */}
          <Link
            href="/sign-in"
            className="flex items-center justify-center w-9 h-9 rounded-full border-2 hover:border-[var(--rsc-main)] transition-colors"
            style={{ borderColor: "var(--rsc-main)" }}
            aria-label="Account"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/png/bust-in-silhouette_1f464.png"
              alt="Profile"
              className="w-4 h-4 object-contain"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
