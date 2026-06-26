import type { Metadata } from "next";

import { OutletsView } from "@/src/components/outlets/outlets-view";

export const metadata: Metadata = { title: "RSC Food Kitchens" };

export default function OutletsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
      <div className="mb-5">
        <h1 className="text-2xl font-bold" style={{ color: "var(--rsc-main)" }}>
          RSC Food Kitchens
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Browse, add to cart, and order — all in one checkout.
        </p>
      </div>

      <OutletsView />
    </div>
  );
}
