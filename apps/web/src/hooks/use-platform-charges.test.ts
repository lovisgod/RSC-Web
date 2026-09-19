import { describe, expect, it } from "vitest";

import type { Cart } from "@/src/lib/data/cart";
import { calculateCartFees, type OutletDeliveryPricingInfo } from "./use-platform-charges";

const DEFAULT_CHARGES = {
  platformCommissionBps: 500, // 5%
  defaultVatBps: 750, // 7.5%
  deliveryFeeMinor: 230_000, // ₦2,300 platform fallback
  serviceFeeMinor: 0,
};

describe("calculateCartFees", () => {
  it("calculates flat delivery fee from outlet pricing model instead of platform fallback", () => {
    const cart: Cart = {
      groups: [
        {
          outletId: "outlet-cactus",
          outletName: "Cactus",
          items: [
            {
              id: "item-1",
              name: "Spicy beef strips",
              notes: "",
              quantity: 1,
              unitPriceMinor: 22_150_00,
              modifiers: [],
            },
          ],
        },
      ],
      deliveryFeeMinor: 0,
    };

    const outletById = new Map<string, OutletDeliveryPricingInfo>([
      [
        "outlet-cactus",
        {
          vatBps: 0,
          deliveryPricingModel: "FLAT",
          deliveryFeeMinor: 70_000, // ₦700 flat fee saved in admin
        },
      ],
    ]);

    const fees = calculateCartFees({
      cart,
      charges: DEFAULT_CHARGES,
      outletById,
    });

    expect(fees.subtotal).toBe(22_150_00);
    expect(fees.delivery).toBe(70_000); // ₦700, NOT ₦2,300!
    expect(fees.vat).toBe(Math.round((22_150_00 * 750) / 10_000)); // Falls back to default platform VAT
    expect(fees.commission).toBe(Math.round((22_150_00 * 500) / 10_000)); // 5%
    expect(fees.total).toBe(
      fees.subtotal + fees.delivery + fees.vat + fees.commission + fees.service,
    );
  });

  it("sums flat delivery fees for multiple outlets in multi-kitchen fulfillment", () => {
    const cart: Cart = {
      groups: [
        {
          outletId: "outlet-cactus",
          outletName: "Cactus",
          items: [
            {
              id: "item-1",
              name: "Spicy beef strips",
              notes: "",
              quantity: 1,
              unitPriceMinor: 22_150_00,
              modifiers: [],
            },
          ],
        },
        {
          outletId: "outlet-farfallino",
          outletName: "Farfallino Kitchen",
          items: [
            {
              id: "item-2",
              name: "Caprese Salad",
              notes: "",
              quantity: 1,
              unitPriceMinor: 2_269_00,
              modifiers: [],
            },
          ],
        },
      ],
      deliveryFeeMinor: 0,
    };

    const outletById = new Map<string, OutletDeliveryPricingInfo>([
      [
        "outlet-cactus",
        {
          vatBps: 0,
          deliveryPricingModel: "FLAT",
          deliveryFeeMinor: 70_000, // ₦700
        },
      ],
      [
        "outlet-farfallino",
        {
          vatBps: 0,
          deliveryPricingModel: "FLAT",
          deliveryFeeMinor: 70_000, // ₦700
        },
      ],
    ]);

    const fees = calculateCartFees({
      cart,
      charges: DEFAULT_CHARGES,
      outletById,
    });

    expect(fees.subtotal).toBe(24_419_00);
    expect(fees.delivery).toBe(140_000); // ₦700 + ₦700 = ₦1,400
    expect(fees.total).toBe(
      fees.subtotal + fees.delivery + fees.vat + fees.commission + fees.service,
    );
  });

  it("falls back to platform delivery fee if outlet has no configured delivery fee", () => {
    const cart: Cart = {
      groups: [
        {
          outletId: "outlet-unconfigured",
          outletName: "New Kitchen",
          items: [
            {
              id: "item-1",
              name: "Burger",
              notes: "",
              quantity: 1,
              unitPriceMinor: 5_000_00,
              modifiers: [],
            },
          ],
        },
      ],
      deliveryFeeMinor: 0,
    };

    const outletById = new Map<string, OutletDeliveryPricingInfo>();

    const fees = calculateCartFees({
      cart,
      charges: DEFAULT_CHARGES,
      outletById,
    });

    expect(fees.delivery).toBe(DEFAULT_CHARGES.deliveryFeeMinor); // ₦2,300 platform fallback
  });

  it("honors includeDelivery = false", () => {
    const cart: Cart = {
      groups: [
        {
          outletId: "outlet-cactus",
          outletName: "Cactus",
          items: [
            {
              id: "item-1",
              name: "Spicy beef strips",
              notes: "",
              quantity: 1,
              unitPriceMinor: 10_000_00,
              modifiers: [],
            },
          ],
        },
      ],
      deliveryFeeMinor: 0,
    };

    const outletById = new Map<string, OutletDeliveryPricingInfo>([
      [
        "outlet-cactus",
        {
          vatBps: 0,
          deliveryPricingModel: "FLAT",
          deliveryFeeMinor: 70_000,
        },
      ],
    ]);

    const fees = calculateCartFees({
      cart,
      charges: DEFAULT_CHARGES,
      outletById,
      options: { includeDelivery: false },
    });

    expect(fees.delivery).toBe(0);
  });

  it("reconciles cart item unit price with active discount from outlet menu items", () => {
    // Cart item was stored with original price 180,000 (Garlic bread)
    const cart: Cart = {
      groups: [
        {
          outletId: "outlet-cactus",
          outletName: "Cactus",
          items: [
            {
              id: "item-garlic-bread",
              name: "Garlic Bread",
              notes: "",
              quantity: 1,
              unitPriceMinor: 180_000, // ₦1,800
              modifiers: [],
            },
          ],
        },
      ],
      deliveryFeeMinor: 0,
    };

    const outletById = new Map<string, OutletDeliveryPricingInfo>([
      [
        "outlet-cactus",
        {
          vatBps: 0,
          deliveryPricingModel: "FLAT",
          deliveryFeeMinor: 70_000,
          menuItems: [
            {
              id: "item-garlic-bread",
              outletId: "outlet-cactus",
              categoryId: "cat-1",
              name: "Garlic Bread",
              description: null,
              imageUrl: null,
              ratingAverage: 0,
              ratingCount: 0,
              priceMinor: 180_000,
              discountPriceMinor: 90_300, // ₦903 active discount
              discountStartsAt: null,
              discountEndsAt: null,
              currentPriceMinor: 90_300,
              isDiscountActive: true,
              currency: "NGN",
              isAvailable: true,
              sortOrder: 0,
              createdAt: "2026-07-27T08:00:00.000Z",
              updatedAt: "2026-07-27T08:00:00.000Z",
              deletedAt: null,
            },
          ],
        },
      ],
    ]);

    const fees = calculateCartFees({
      cart,
      charges: DEFAULT_CHARGES,
      outletById,
    });

    // Subtotal must be 90,300 (discount price), NOT 180,000
    expect(fees.subtotal).toBe(90_300);
    expect(fees.vat).toBe(Math.round((90_300 * 750) / 10_000));
    expect(fees.commission).toBe(Math.round((90_300 * 500) / 10_000));
  });
});
