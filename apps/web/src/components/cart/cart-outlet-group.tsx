import { Card } from "@rsc/ui";

import {
  formatNaira,
  itemLabel,
  outletSubtotalMinor,
  type CartOutletGroup,
} from "@/src/lib/data/cart";

export function CartOutletGroupCard({ group }: { group: CartOutletGroup }) {
  const subtotal = outletSubtotalMinor(group);

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 mb-3">
        <h2 className="text-xl font-bold text-gray-900">{group.outletName}</h2>
        <span className="text-base font-semibold text-gray-900 flex-shrink-0">
          {formatNaira(subtotal)}
        </span>
      </div>

      <ul className="space-y-2">
        {group.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-gray-500">{itemLabel(item)}</span>
            <span className="text-gray-400 flex-shrink-0">
              {formatNaira(item.unitPriceMinor * item.quantity)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
