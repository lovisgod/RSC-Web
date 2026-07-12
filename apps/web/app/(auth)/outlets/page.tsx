import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { OutletsView } from "@/src/components/outlets/outlets-view";
import { OffersSection } from "@/src/components/outlets/offers-section";
import { RecentOrderRatingPrompt } from "@/src/components/ratings/recent-order-rating-prompt";

export const metadata: Metadata = { title: "Kitchens" };

export default function OutletsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-4 sm:p-6 lg:p-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--rsc-main)" }}>
            RSC Food Kitchens
          </h1>
          <p className="mt-0.5 text-sm text-gray-400">
            Browse, add to cart, and order — all in one checkout.
          </p>
        </div>
        <Link
          href="/menu"
          aria-label="Search menu"
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-[0_8px_20px_rgba(30,49,96,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(30,49,96,0.24)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rsc-brand)] sm:h-auto sm:min-h-11 sm:w-auto sm:gap-2 sm:px-4 sm:py-2.5"
          style={{ backgroundColor: "var(--rsc-main)" }}
        >
          <Search className="h-6 w-6 sm:h-4 sm:w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Search menu</span>
        </Link>
      </div>

      <RecentOrderRatingPrompt />
      <OffersSection />
      <OutletsView />
    </div>
  );
}
