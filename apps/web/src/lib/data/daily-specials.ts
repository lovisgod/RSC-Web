import type { MenuItemSummary, OutletSummary } from "@rsc/contracts";

export interface DailySpecialItem extends MenuItemSummary {
  outletName: string;
  discountPercent: number;
}

export function resolveSpecialImage(item: MenuItemSummary): string {
  if (item.imageUrl && !item.imageUrl.includes("fire_1f525")) {
    return item.imageUrl;
  }

  const name = (item.name || "").toLowerCase();

  if (
    name.includes("suya") ||
    name.includes("meat") ||
    name.includes("grill") ||
    name.includes("skewer")
  ) {
    return "https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80";
  }

  if (
    name.includes("pasta") ||
    name.includes("alfredo") ||
    name.includes("spaghetti") ||
    name.includes("macaroni")
  ) {
    return "https://images.unsplash.com/photo-1621996346565-e3d5d6281084?w=500&auto=format&fit=crop&q=80";
  }

  if (name.includes("pizza") || name.includes("pepperoni")) {
    return "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&auto=format&fit=crop&q=80";
  }

  if (name.includes("rice") || name.includes("jollof")) {
    return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80";
  }

  return "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=80";
}

export function getDailySpecials(outlets: OutletSummary[]): DailySpecialItem[] {
  const currentTime = Date.now();

  return outlets
    .flatMap((outlet) =>
      outlet.menuItems
        .filter((item) => {
          if (!item.isAvailable) return false;
          if (
            item.discountPriceMinor === null ||
            item.discountPriceMinor === undefined ||
            item.discountPriceMinor <= 0 ||
            item.discountPriceMinor >= item.priceMinor
          ) {
            return false;
          }

          if (item.isDiscountActive) {
            return true;
          }

          const startsAt = item.discountStartsAt
            ? new Date(item.discountStartsAt).getTime()
            : Number.NEGATIVE_INFINITY;
          const endsAt = item.discountEndsAt
            ? new Date(item.discountEndsAt).getTime()
            : Number.POSITIVE_INFINITY;

          return currentTime >= startsAt && currentTime <= endsAt;
        })
        .map((item) => {
          const discountPrice = item.discountPriceMinor ?? item.priceMinor;
          const discountPercent =
            item.priceMinor > 0
              ? Math.round(((item.priceMinor - discountPrice) / item.priceMinor) * 100)
              : 0;

          return {
            ...item,
            outletName: outlet.name,
            discountPercent,
          };
        }),
    )
    .sort((a, b) => b.discountPercent - a.discountPercent || b.ratingAverage - a.ratingAverage);
}
