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
  const disabled = soldOut || loading;

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onViewOptions}
      disabled={disabled}
      aria-label={`${loading ? "Loading options for" : "View options for"} ${item.name} from ${outletName}`}
      className={`flex w-full items-start gap-3 rounded-2xl border border-gray-100 bg-white p-3 text-left shadow-sm transition hover:border-[color:color-mix(in_srgb,var(--rsc-main)_18%,white)] hover:shadow-[0_10px_24px_rgba(30,49,96,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rsc-main)] disabled:cursor-not-allowed ${soldOut ? "opacity-60" : ""}`}
    >
      {/* Thumbnail */}
      <div
        className={`w-20 h-20 flex-shrink-0 overflow-hidden rounded-xl flex items-center justify-center text-4xl ${soldOut ? "grayscale" : ""}`}
        style={{ backgroundColor: bgColor }}
      >
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl!} alt={item.name} className="h-full w-full object-cover" />
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
          <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading…
              </>
            ) : (
              "View options"
            )}
          </span>
        </div>
      </div>
    </button>
  );
}
