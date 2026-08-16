import type { ReceiptPrintInput } from "./native-bridge";
import type { PosSubOrder } from "./api";

export function formatReceiptMoney(minor: number): string {
  return `₦${(minor / 100).toLocaleString("en-NG")}`;
}

export function buildReceiptFromSubOrder(order: PosSubOrder): ReceiptPrintInput {
  const resolveBaseUnitPriceMinor = (item: PosSubOrder["items"][number]) => {
    if (typeof item.baseUnitPriceMinor === "number") {
      return item.baseUnitPriceMinor;
    }

    const modifierTotal = item.modifiers?.reduce(
      (sum, modifier) => sum + modifier.priceDeltaMinor,
      0,
    );

    return Math.max(0, item.priceMinor - (modifierTotal ?? 0));
  };

  const modifiersMinor = order.items.reduce(
    (sum, item) =>
      sum +
      (item.modifiers?.reduce(
        (modifierSum, modifier) => modifierSum + modifier.priceDeltaMinor * item.quantity,
        0,
      ) ?? 0),
    0,
  );
  const deliveryMode = order.deliveryMode === "DELIVERY" ? "DELIVERY" : "TAKEOUT";

  return {
    receiptId: `${order.id}:${Date.now()}`,
    orderId: order.id,
    masterOrderId: order.masterOrderId,
    title: `Order #${order.id.slice(-8).toUpperCase()}`,
    orderCode: order.pickupCode ?? order.deliveryCode,
    deliveryMode,
    printedAt: new Date().toISOString(),
    currency: "NGN",
    items: order.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPriceMinor: resolveBaseUnitPriceMinor(item),
      ...(item.modifiers?.length
        ? {
            modifiers: item.modifiers.map((modifier) => ({
              name: modifier.name,
              amountMinor: modifier.priceDeltaMinor,
            })),
          }
        : {}),
      ...(item.customerNote ? { customerNote: item.customerNote } : {}),
      lineTotalMinor: item.lineTotalMinor,
    })),
    totals: {
      subtotalMinor: order.totalAmountMinor,
      modifiersMinor,
      totalMinor: order.totalAmountMinor,
    },
    footer: "Thank you for choosing DineOut NG.",
  };
}
