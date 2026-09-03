import type { OutletSummary } from "@rsc/contracts";

import { computeOutletMetrics } from "@/src/lib/data/outlet-menu";

export const DEFAULT_OUTLET_RATING = 4.0;

export function formatOutletRating(rating: number | null | undefined): string {
  const value = typeof rating === "number" && rating > 0 ? rating : DEFAULT_OUTLET_RATING;

  return value.toFixed(1);
}

export interface Outlet {
  id: string;
  name: string;
  cuisines: string[];
  headerColor: string;
  image: string;
  logoUrl?: string | null;
  bannerImage?: string;
  isOnline?: boolean;
  vatBps: number;
  // Optional — not yet returned by the API
  rating?: number;
  deliveryTime?: string;
  tag?: string;
}

// High resolution outlet card clean backdrops matching the reference design
const OUTLET_GRAPHICS = [
  { headerColor: "#071a10", image: "/outlets/cactus-card-clean.png" },
  { headerColor: "#071a0f", image: "/outlets/salmas-card-clean.png" },
  { headerColor: "#f5ece0", image: "/outlets/farfallino-card-clean.png" },
  { headerColor: "#071a10", image: "/outlets/cactus-card-clean.png" },
];

function resolveOutletGraphic(name: string, index: number) {
  const lower = (name || "").toLowerCase();
  if (lower.includes("cactus")) return OUTLET_GRAPHICS[0]!;
  if (lower.includes("salma")) return OUTLET_GRAPHICS[1]!;
  if (lower.includes("farfallino")) return OUTLET_GRAPHICS[2]!;
  if (lower.includes("naija") || lower.includes("taste")) return OUTLET_GRAPHICS[3]!;
  return OUTLET_GRAPHICS[index % OUTLET_GRAPHICS.length]!;
}

/** Maps an API OutletSummary to the local display Outlet type. */
export function toDisplayOutlet(summary: OutletSummary, index: number): Outlet {
  const graphic = resolveOutletGraphic(summary.name, index);
  const metrics = computeOutletMetrics(summary.menuItems);
  return {
    id: summary.id,
    name: summary.name,
    cuisines: [summary.cuisineType],
    headerColor: graphic.headerColor,
    image:
      summary.imageUrl && !summary.imageUrl.includes("unsplash") ? summary.imageUrl : graphic.image,
    logoUrl: summary.logoUrl ?? null,
    ...(summary.bannerUrl ? { bannerImage: summary.bannerUrl } : {}),
    isOnline: summary.isOnline,
    vatBps: summary.vatBps,
    ...(!summary.isOnline ? { tag: "Offline" } : {}),
    ...metrics,
  };
}
