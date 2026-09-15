import type { Metadata } from "next";
import Link from "next/link";
import { Utensils } from "lucide-react";

import { FavoritesView } from "@/src/components/favorites/favorites-view";

export const metadata: Metadata = { title: "My Favourites" };

export default function FavoritesPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-4 sm:p-6 lg:p-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--rsc-main)" }}>
            My Favourites
          </h1>
          <p className="mt-0.5 text-sm text-gray-400">
            Quickly order from your saved and favorite meals.
          </p>
        </div>
        <Link
          href="/menu"
          aria-label="Browse menu"
          className="rsc-button rsc-button--primary shrink-0 gap-2"
        >
          <Utensils className="h-5 w-5" aria-hidden="true" />
          <span className="hidden sm:inline">Browse Menu</span>
        </Link>
      </div>

      <FavoritesView />
    </div>
  );
}
