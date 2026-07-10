"use client";

import { Button, Card } from "@rsc/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ApiError } from "@rsc/api-client";
import { apiClient } from "@/src/lib/api";
import { formatNaira } from "@/src/lib/data/cart";
import { getStatusConfig, type Order } from "@/src/lib/data/orders";

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
  const router = useRouter();
  const status = getStatusConfig(order.status);

  const reorderMutation = useMutation({
    mutationFn: async () => {
      const config = await apiClient.reorder(order.id);
      return apiClient.initiatePayment(config);
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        toast.success("Reorder placed!");
        router.push("/orders");
      }
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError ? err.message : "Could not place reorder. Please try again.",
      );
    },
  });

  return (
    <Card className="space-y-3">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold leading-tight text-gray-900">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </h3>
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: status.bg, color: status.color }}
            >
              {status.label}
            </span>
          </div>

          <p className="mt-1 text-sm font-semibold text-gray-700">
            {formatNaira(order.totalMinor)}
          </p>

          {order.deliveryAddress && (
            <p className="mt-0.5 truncate text-xs text-gray-400">→ {order.deliveryAddress}</p>
          )}

          <p className="mt-1 text-xs text-gray-400">
            {order.deliveryMode === "DELIVERY" ? "Delivery" : "Takeout"} ·{" "}
            {formatDate(order.createdAt)}
          </p>

          {variant === "active" && order.deliveryCode && (
            <p className="mt-2 text-xs font-semibold text-gray-600">
              Delivery code: <span className="font-mono">{order.deliveryCode}</span>
            </p>
          )}
        </div>

        {variant === "completed" ? (
          <Button
            tone="primary"
            type="button"
            onClick={() => reorderMutation.mutate()}
            disabled={reorderMutation.isPending}
          >
            {reorderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reorder"}
          </Button>
        ) : (
          <Button
            tone="primary"
            type="button"
            className="!rounded-lg !px-4"
            onClick={() => router.push(`/tracking?orderId=${order.id}`)}
          >
            Track
          </Button>
        )}
      </div>
    </Card>
  );
}
