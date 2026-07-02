import { formatNaira } from "@/src/lib/data/cart";
import type { MenuItem } from "@/src/lib/data/outlet-menu";

interface MenuSearchItemCardProps {
  item: MenuItem;
  onViewOptions: () => void;
}

export function MenuSearchItemCard({ item, onViewOptions }: MenuSearchItemCardProps) {
  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-start gap-3 p-3">
      {/* Image thumbnail */}
      <div
        className="w-20 h-20 flex-shrink-0 rounded-xl flex items-center justify-center text-4xl"
        style={{ backgroundColor: item.bgColor }}
      >
        {item.image.startsWith("/") || item.image.startsWith("http") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={item.name} className="w-12 h-12 object-contain" />
        ) : (
          <span>{item.image}</span>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-gray-900 text-sm leading-tight">{item.name}</h3>
        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>

        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-bold" style={{ color: "var(--rsc-dark)" }}>
            {formatNaira(item.priceMinor)}
          </span>
          <button
            type="button"
            onClick={onViewOptions}
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            View options
          </button>
        </div>
      </div>
    </article>
  );
}
