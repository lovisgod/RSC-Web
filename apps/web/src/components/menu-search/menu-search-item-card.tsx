import { Heart, Loader2 } from "lucide-react";

import type { MenuItemSummary } from "@rsc/contracts";
import { DiscountPrice } from "@rsc/ui";
import { useFavoritesStore } from "@/src/stores/favorites-store";

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
  const isFavorite = useFavoritesStore((s) => s.isItemFavorite(item.id));
  const toggleFavorite = useFavoritesStore((s) => s.toggleItem);

  return (
    <article
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onViewOptions}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onViewOptions();
        }
      }}
      aria-disabled={disabled}
      aria-label={`${loading ? "Loading options for" : "View options for"} ${item.name} from ${outletName}`}
      className={`flex w-full items-start gap-3 rounded-2xl border border-gray-100 bg-white p-3 text-left shadow-sm transition hover:border-[color:color-mix(in_srgb,var(--rsc-main)_18%,white)] hover:shadow-[0_10px_24px_rgba(30,49,96,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rsc-main)] ${
        disabled ? "cursor-not-allowed" : "cursor-pointer"
      } ${soldOut ? "opacity-60" : ""}`}
    >
      {/* Thumbnail */}
      <div
        className={`relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-xl flex items-center justify-center text-4xl ${soldOut ? "grayscale" : ""}`}
        style={{ backgroundColor: bgColor }}
      >
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl!} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <span>{emoji}</span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(item.id);
          }}
          aria-label={
            isFavorite ? `Remove ${item.name} from favorites` : `Add ${item.name} to favorites`
          }
          className={`absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center backdrop-blur-sm transition-transform active:scale-90 ${
            isFavorite
              ? "bg-white text-red-500 shadow-sm"
              : "bg-black/35 text-white hover:bg-black/55"
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-current" : ""}`} />
        </button>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        {/* Kitchen badge */}
        <span
          className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1 border border-[color-mix(in_srgb,var(--rsc-main)_20%,transparent)]"
          style={{
            backgroundColor: "color-mix(in srgb, var(--rsc-main) 16%, var(--rsc-panel))",
            color: "var(--rsc-brand)",
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
          <DiscountPrice
            className="text-sm"
            priceMinor={item.priceMinor}
            currentPriceMinor={item.currentPriceMinor}
            isDiscountActive={item.isDiscountActive}
            showBadge
          />
          <span className="flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--rsc-panel)_85%,var(--rsc-line))] border border-[var(--rsc-line)] px-3 py-1.5 text-xs font-semibold text-[var(--rsc-ink)] shadow-xs transition-all group-hover:bg-[var(--rsc-brand)] group-hover:text-white group-hover:border-[var(--rsc-brand)]">
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
    </article>
  );
}
