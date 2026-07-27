import type { MenuItem } from "@/src/lib/data/outlet-menu";
import { DiscountPrice } from "@rsc/ui";

interface MenuItemCardProps {
  item: MenuItem;
  onAdd: () => void;
  disabled?: boolean;
  disabledLabel?: string | undefined;
}

export function MenuItemCard({ item, onAdd, disabled = false, disabledLabel }: MenuItemCardProps) {
  const soldOut = !item.isAvailable;
  const unavailable = soldOut || disabled;
  const statusLabel = soldOut ? "Sold out" : disabledLabel;

  return (
    <article
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 p-3 transition-opacity ${unavailable ? "opacity-60" : ""}`}
    >
      {/* Thumbnail */}
      <div
        className={`w-20 h-20 flex-shrink-0 rounded-xl flex items-center justify-center text-4xl ${unavailable ? "grayscale" : ""}`}
        style={{ backgroundColor: item.bgColor }}
      >
        {item.image.startsWith("/") || item.image.startsWith("http") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-4xl">{item.image}</span>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-gray-900 text-sm leading-tight">{item.name}</h3>
          {statusLabel && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-red-500">
              {statusLabel}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>
        <DiscountPrice
          className="mt-1.5 text-sm"
          priceMinor={item.originalPriceMinor}
          currentPriceMinor={item.priceMinor}
          isDiscountActive={item.isDiscountActive}
          showBadge
        />
      </div>

      {/* Add button */}
      <button
        type="button"
        onClick={unavailable ? undefined : onAdd}
        disabled={unavailable}
        aria-label={unavailable ? `${item.name} unavailable` : `Add ${item.name}`}
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-xl font-bold transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
        style={{ backgroundColor: "var(--rsc-main)" }}
      >
        +
      </button>
    </article>
  );
}
