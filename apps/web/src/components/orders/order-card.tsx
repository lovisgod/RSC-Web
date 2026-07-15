"use client";

import { Button, Card } from "@rsc/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ApiError } from "@rsc/api-client";
import type { InitiatePaymentInput, OutletSummary } from "@rsc/contracts";
import { OUTLETS_QUERY } from "@/src/hooks/use-outlets";
import { apiClient } from "@/src/lib/api";
import { formatNaira } from "@/src/lib/data/cart";
import { getStatusConfig, type Order } from "@/src/lib/data/orders";
import { useCartStore } from "@/src/stores/cart-store";

interface OrderCardProps {
  order: Order;
  variant?: "active" | "completed" | "cancelled";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function hydrateCartFromReorder(config: InitiatePaymentInput, outlets: OutletSummary[]) {
  const rows: Array<{
    outletId: string;
    outletName: string;
    item: {
      id: string;
      name: string;
      notes: string;
      quantity: number;
      unitPriceMinor: number;
      modifiers: { modifierId: string }[];
    };
  }> = [];
  const missingItems: string[] = [];

  for (const reorderItem of config.items) {
    const outlet = outlets.find((candidate) =>
      candidate.menuItems.some((item) => item.id === reorderItem.menuItemId),
    );
    const menuItem = outlet?.menuItems.find((item) => item.id === reorderItem.menuItemId);

    if (!outlet || !menuItem) {
      missingItems.push(reorderItem.menuItemId);
      continue;
    }

    const selectedModifiers = reorderItem.modifiers.filter((modifier) =>
      outlet.itemModifiers.some((candidate) => candidate.id === modifier.modifierId),
    );
    const modifierTotal = selectedModifiers.reduce((sum, modifier) => {
      const currentModifier = outlet.itemModifiers.find(
        (candidate) => candidate.id === modifier.modifierId,
      );
      return sum + (currentModifier?.priceDeltaMinor ?? 0);
    }, 0);

    rows.push({
      outletId: outlet.id,
      outletName: outlet.name,
      item: {
        id: menuItem.id,
        name: menuItem.name,
        notes: reorderItem.customerNote ?? "",
        quantity: reorderItem.quantity,
        unitPriceMinor: menuItem.priceMinor + modifierTotal,
        modifiers: selectedModifiers,
      },
    });
  }

  return { rows, missingItems };
}

export function OrderCard({ order, variant = "completed" }: OrderCardProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const status = getStatusConfig(order.status);
  const isPendingPayment = order.status.toUpperCase() === "PENDING_PAYMENT";
  const addItem = useCartStore((state) => state.addItem);
  const clearCart = useCartStore((state) => state.clear);

  const retryPaymentMutation = useMutation({
    mutationFn: () =>
      apiClient.retryPayment(order.id, {
        returnUrl: `${window.location.origin}/payment/return`,
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });

      if (!result.checkoutUrl) {
        toast.error("Payment provider currently unavailable. Please try again later.");
        return;
      }

      window.location.assign(result.checkoutUrl);
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError ? err.message : "Could not restart payment. Please try again.",
      );
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async () => {
      const config = await apiClient.reorder(order.id);
      const outlets = await queryClient.ensureQueryData(OUTLETS_QUERY);
      return hydrateCartFromReorder(config, outlets);
    },
    onSuccess: ({ rows, missingItems }) => {
      if (rows.length === 0) {
        toast.error("Those items are no longer available for reorder.");
        return;
      }

      clearCart();
      rows.forEach((row) => addItem(row));

      if (missingItems.length > 0) {
        toast.warning("Some previous items are no longer available and were skipped.");
      } else {
        toast.success("Previous order loaded into your cart.");
      }

      router.push("/cart");
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

          {variant === "active" && !isPendingPayment && order.deliveryCode && (
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
        ) : variant === "cancelled" ? (
          <Button
            tone="danger"
            type="button"
            onClick={() => toast.info("Refund support is coming soon.")}
          >
            Refund
          </Button>
        ) : (
          <Button
            tone="primary"
            type="button"
            className={`!rounded-lg ${isPendingPayment ? "!px-2 !py-2" : "!px-4 !py-1.5"}`}
            onClick={() => {
              if (isPendingPayment) {
                retryPaymentMutation.mutate();
                return;
              }

              router.push(`/tracking?orderId=${order.id}`);
            }}
            disabled={retryPaymentMutation.isPending}
          >
            {retryPaymentMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isPendingPayment ? (
              "Make payment"
            ) : (
              "Track"
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}
