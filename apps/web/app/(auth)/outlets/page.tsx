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
            DineOut NG Kitchens
          </h1>
          <p className="mt-0.5 text-sm text-gray-400">
            Browse, add to cart, and order — all in one checkout.
          </p>
        </div>
        <Link
          href="/menu"
          aria-label="Search menu"
          className="rsc-button rsc-button--primary shrink-0 gap-2"
        >
          <Search className="h-6 w-6 sm:h-5 sm:w-5" aria-hidden="true" />
          <span className="hidden sm:inline">Search menu</span>
        </Link>
      </div>

      <RecentOrderRatingPrompt />
      <OffersSection />
      <OutletsView />
    </div>
  );
}
