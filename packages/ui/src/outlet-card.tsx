// packages/ui/src/OutletCard.tsx
import type { OutletSummary } from "@rsc/contracts";

const BANNER_COLORS = [
  "var(--rsc-brand)", // forest green
  "var(--rsc-accent-deep)", // orange
  "var(--rsc-auth)", // blue
  "var(--rsc-danger)", // red
  "var(--rsc-auth-strong)", // dark blue
  "var(--rsc-accent)", // amber
];

function pickBannerColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return BANNER_COLORS[hash % BANNER_COLORS.length]!;
}

interface OutletCardProps {
  Outlet: OutletSummary;
  onOrder?: (id: string) => void;
}

export function OutletCard({ Outlet, onOrder }: OutletCardProps) {
  const { name, slug, cuisineType, description, imageUrl, isOnline } = Outlet;

  return (
    <div className="  w-1/2 bg-rsc-panel rounded-rsc shadow-md overflow-hidden border border-rsc-line transition-all duration-200 hover:shadow-lg">
      {/* Banner Back-plate */}
      <div
        className="h-32 flex items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: pickBannerColor(Outlet.id) }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name}
            width={80}
            height={80}
            className="object-contain drop-shadow-md z-10"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-rsc-line/40 z-10" />
        )}
        <div className="absolute inset-0 opacity-10 bg-black/10 mix-blend-overlay" />
      </div>

      {/* Card Body */}
      <div className=" p-4">
        <h2 className="font-bold text-lg text-rsc-ink tracking-tight">{name}</h2>
        <p className="text-sm text-rsc-muted line-clamp-1">{slug}</p>

        <div className="flex items-center justify-between mt-4 pt-2 border-t border-rsc-line/50">
          <div className="flex items-center gap-1.5 text-rsc-accent font-bold text-sm">
            {/* <span>⭐</span> {rating.toFixed(1)} */}
          </div>

          <div className="text-rsc-muted text-xs font-medium bg-gray-100 px-2 py-1 rounded-md">
            {/* ⏱ {deliveryTime} */}
          </div>

          <button
            onClick={() => onOrder?.(Outlet.id)}
            className="text-rsc-brand font-bold text-sm hover:text-rsc-brand-strong transition-colors duration-150"
          >
            Order Now
          </button>
        </div>
      </div>
    </div>
  );
}
