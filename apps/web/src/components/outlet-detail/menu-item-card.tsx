import { formatNaira } from "@/src/lib/data/cart";
import type { MenuItem } from "@/src/lib/data/outlet-menu";

interface MenuItemCardProps {
  item: MenuItem;
  onAdd: () => void;
}

export function MenuItemCard({ item, onAdd }: MenuItemCardProps) {
  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 p-3">
      {/* Emoji thumbnail */}
      <div
        className="w-20 h-20 flex-shrink-0 rounded-xl flex items-center justify-center text-4xl"
        style={{ backgroundColor: item.bgColor }}
      >
        {item.image.startsWith("/") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={item.name} className="w-12 h-12 object-contain" />
        ) : (
          <span className="text-4xl">{item.image}</span>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-gray-900 text-sm leading-tight">{item.name}</h3>
        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>
        <p className="text-sm font-bold mt-1.5" style={{ color: "var(--rsc-dark)" }}>
          {formatNaira(item.priceMinor)}
        </p>
      </div>

      {/* Add button */}
      <button
        type="button"
        onClick={onAdd}
        aria-label={`Add ${item.name}`}
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-xl font-bold transition-opacity hover:opacity-80"
        style={{ backgroundColor: "var(--rsc-main)" }}
      >
        +
      </button>
    </article>
  );
}
