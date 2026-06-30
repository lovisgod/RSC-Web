"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Card } from "@rsc/ui";

import { apiClient } from "@/src/lib/api";
import { STATUS_CONFIG, type Order } from "@/src/lib/data/orders";

interface OrderCardProps {
  order: Order;
  variant?: "active" | "completed";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function OrderCard({ order, variant = "completed" }: OrderCardProps) {
  const queryClient = useQueryClient();
  const kitchenSummary = order.subOrders.map((s) => s.outletName).join(", ");
  const status = STATUS_CONFIG[order.status];

  const reorderMutation = useMutation({
    mutationFn: () => apiClient.reorder(order.id),
    onSuccess: () => {
      toast.success("Reorder placed! Check your active orders.");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: () => {
      toast.error("Could not place reorder. Please try again.");
    },
  });

  return (
    <Card className="space-y-3">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900 text-base leading-tight">{order.id}</h3>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ backgroundColor: status.bg, color: status.color }}
            >
              {status.label}
            </span>
          </div>

          {kitchenSummary && (
            <p className="text-sm text-gray-600 mt-0.5 truncate">{kitchenSummary}</p>
          )}

          {order.deliveryAddress && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">→ {order.deliveryAddress}</p>
          )}

          <p className="text-xs text-gray-400 mt-1">{formatDate(order.createdAt)}</p>
        </div>

        {variant === "completed" ? (
          <Button
            tone="primary"
            type="button"
            onClick={() => reorderMutation.mutate()}
            disabled={reorderMutation.isPending}
          >
            {reorderMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reorder"}
          </Button>
        ) : (
          <Button tone="primary" type="button">
            Track
          </Button>
        )}
      </div>
    </Card>
  );
}
