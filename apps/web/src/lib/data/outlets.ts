import type { OutletSummary } from "@rsc/contracts";

export interface Outlet {
  id: string;
  name: string;
  cuisines: string[];
  headerColor: string;
  image: string;
  isOnline?: boolean;
  // Optional — not yet returned by the API
  rating?: number;
  deliveryTime?: string;
  tag?: string;
}

// Deterministic palette — each outlet gets a consistent colour/image fallback
const PALETTE = [
  { headerColor: "#1e3160", image: "/images/images/fire_1f525.png" },
  { headerColor: "#2D5A27", image: "/images/images/steaming-bowl_1f35c.png" },
  { headerColor: "#8B1A1A", image: "/images/images/hot-pepper_1f336-fe0f.png" },
  { headerColor: "#6B21A8", image: "/images/images/shortcake_1f370.png" },
  { headerColor: "#B05B00", image: "/images/images/meat-on-bone_1f356.png" },
];

/** Maps an API OutletSummary to the local display Outlet type. */
export function toDisplayOutlet(summary: OutletSummary, index: number): Outlet {
  const palette = PALETTE[index % PALETTE.length]!;
  return {
    id: summary.id,
    name: summary.name,
    cuisines: [summary.cuisineType],
    headerColor: palette.headerColor,
    image: summary.imageUrl ?? palette.image,
    isOnline: summary.isOnline,
    tag: !summary.isOnline ? "Offline" : undefined,
  };
}
