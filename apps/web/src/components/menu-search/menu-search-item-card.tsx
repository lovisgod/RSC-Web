import { Loader2 } from "lucide-react";

import { formatNaira } from "@/src/lib/data/cart";
import type { MenuItemSummary } from "@rsc/contracts";

const FOOD_EMOJIS = ["🍲", "🥗", "🍛", "🍜", "🥘", "🍱", "🍖", "🍗", "🥩", "🍝"];
const BG_COLORS = [
  "#FFF3E0",
  "#F3E5F5",
  "#E8F5E9",
  "#E3F2FD",
  "#FBE9E7",
  "#FFF8E1",
  "#FCE4EC",
  "#F1F8E9",
  "#FFFDE7",
  "#EFEBE9",
];

interface MenuSearchItemCardProps {
  item: MenuItemSummary;
  outletName: string;
  loading?: boolean;
  onViewOptions: () => void;
}

export function MenuSearchItemCard({
  item,
  outletName,
  loading,
  onViewOptions,
}: MenuSearchItemCardProps) {
  const seed = item.id.charCodeAt(0) + item.id.charCodeAt(1);
  const bgColor = BG_COLORS[seed % BG_COLORS.length]!;
  const emoji = FOOD_EMOJIS[seed % FOOD_EMOJIS.length]!;
  const hasImage = !!item.imageUrl;
  const soldOut = !item.isAvailable;

  return (
    <article
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm flex items-start gap-3 p-3 transition-opacity ${soldOut ? "opacity-60" : ""}`}
    >
      {/* Thumbnail */}
      <div
        className={`w-20 h-20 flex-shrink-0 rounded-xl flex items-center justify-center text-4xl ${soldOut ? "grayscale" : ""}`}
        style={{ backgroundColor: bgColor }}
      >
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl!} alt={item.name} className="w-12 h-12 object-contain" />
        ) : (
          <span>{emoji}</span>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        {/* Kitchen badge */}
        <span
          className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1"
          style={{
            backgroundColor: "color-mix(in srgb, var(--rsc-main) 12%, white)",
            color: "var(--rsc-dark)",
          }}
        >
          📍 {outletName}
        </span>

        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-gray-900 text-sm leading-tight">{item.name}</h3>
          {soldOut && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-red-500">
              Sold out
            </span>
          )}
        </div>

        {item.description && (
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>
        )}

        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-bold" style={{ color: "var(--rsc-dark)" }}>
            {formatNaira(item.priceMinor)}
          </span>
          <button
            type="button"
            onClick={soldOut || loading ? undefined : onViewOptions}
            disabled={soldOut || loading}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading…
              </>
            ) : (
              "View options"
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
