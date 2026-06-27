import { Button, Card } from "@rsc/ui";

import { type Order } from "@/src/lib/data/orders";

interface OrderCardProps {
  order: Order;
  variant?: "active" | "completed";
}

export function OrderCard({ order, variant = "completed" }: OrderCardProps) {
  const kitchenSummary = order.kitchens.join(", ");
  const description = `${kitchenSummary} — Delivered to ${order.deliveryAddress}`;

  return (
    <Card className="flex items-center gap-3 sm:gap-4">
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-gray-900 text-lg leading-tight">{order.id}</h3>
        <p className="text-sm text-gray-400 mt-0.5 truncate">{description}</p>
      </div>

      {variant === "completed" ? (
        <Button tone="primary">Reorder</Button>
      ) : (
        <Button tone="primary">Track</Button>
      )}
    </Card>
  );
}
