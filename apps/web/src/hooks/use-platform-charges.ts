"use client";

import { useQuery } from "@tanstack/react-query";
import {
  calculateOutletDeliveryFee,
  getMenuItemCurrentPriceMinor,
  type DeliveryLocationFee,
  type DeliveryPricingModel,
  type ItemModifierSummary,
  type MenuItemSummary,
} from "@rsc/contracts";

import { apiClient } from "@/src/lib/api";
import { outletSubtotalMinor, type Cart, type CartItem } from "@/src/lib/data/cart";

export function usePlatformCharges() {
  return useQuery({
    queryKey: ["platform-charges"],
    queryFn: () => apiClient.getPlatformCharges(),
    staleTime: 10 * 60 * 1000, // charges rarely change — cache 10 min
  });
}

export interface OutletDeliveryPricingInfo {
  id?: string;
  vatBps?: number | null;
  deliveryPricingModel?: DeliveryPricingModel | null;
  deliveryFeeMinor?: number | null;
  deliveryBaseFeeMinor?: number | null;
  deliveryPricePerKmMinor?: number | null;
  deliveryLocationFees?: DeliveryLocationFee[] | null;
  latitude?: number | null;
  longitude?: number | null;
  menuItems?: MenuItemSummary[] | null;
  itemModifiers?: ItemModifierSummary[] | null;
}

export function resolveCartItemUnitPriceMinor(
  item: CartItem,
  outlet?: OutletDeliveryPricingInfo | null,
  at: Date = new Date(),
): number {
  const menuItem = outlet?.menuItems?.find((m) => m.id === item.id);
  if (!menuItem) {
    return item.unitPriceMinor;
  }

  const baseUnitPriceMinor = getMenuItemCurrentPriceMinor(menuItem, at);
  let modifiersTotalMinor = 0;
  if (item.modifiers && item.modifiers.length > 0 && outlet?.itemModifiers) {
    const modifierMap = new Map(outlet.itemModifiers.map((mod) => [mod.id, mod.priceDeltaMinor]));
    for (const mod of item.modifiers) {
      modifiersTotalMinor += modifierMap.get(mod.modifierId) ?? 0;
    }
  }

  return baseUnitPriceMinor + modifiersTotalMinor;
}

export interface CalculateCartFeesOptions {
  includeDelivery?: boolean | undefined;
  deliveryLatitude?: number | null | undefined;
  deliveryLongitude?: number | null | undefined;
  zoneId?: string | null | undefined;
  zoneName?: string | null | undefined;
}

export interface CalculateCartFeesParams {
  cart: Cart;
  charges: {
    platformCommissionBps: number;
    defaultVatBps: number;
    deliveryFeeMinor: number;
    serviceFeeMinor: number;
  };
  outletById?: Map<string, OutletDeliveryPricingInfo> | null;
  options?: CalculateCartFeesOptions;
}

/**
 * Calculate all checkout fees honoring each outlet's delivery pricing model,
 * custom VAT rates, and platform commission.
 */
export function calculateCartFees({
  cart,
  charges,
  outletById,
  options = {},
}: CalculateCartFeesParams) {
  const groupSubtotals = new Map<string, number>();
  for (const group of cart.groups) {
    const outlet = outletById?.get(group.outletId);
    const gSubtotal = group.items.reduce((sum, item) => {
      const unitPrice = resolveCartItemUnitPriceMinor(item, outlet);
      return sum + unitPrice * item.quantity;
    }, 0);
    groupSubtotals.set(group.outletId, gSubtotal);
  }

  const subtotal = Array.from(groupSubtotals.values()).reduce((a, b) => a + b, 0);

  const commission = cart.groups.reduce((sum, group) => {
    const groupSubtotal = groupSubtotals.get(group.outletId) ?? outletSubtotalMinor(group);
    return sum + Math.round((groupSubtotal * charges.platformCommissionBps) / 10_000);
  }, 0);

  const vat = cart.groups.reduce((sum, group) => {
    const groupSubtotal = groupSubtotals.get(group.outletId) ?? outletSubtotalMinor(group);
    const outletVatBps = outletById?.get(group.outletId)?.vatBps ?? 0;
    const vatBps = outletVatBps > 0 ? outletVatBps : charges.defaultVatBps;
    return sum + Math.round((groupSubtotal * vatBps) / 10_000);
  }, 0);

  const delivery =
    options.includeDelivery === false
      ? 0
      : cart.groups.reduce((sum, group) => {
          const outlet = outletById?.get(group.outletId);
          const fee = calculateOutletDeliveryFee({
            pricingModel: outlet?.deliveryPricingModel ?? undefined,
            flatFeeMinor: outlet?.deliveryFeeMinor ?? undefined,
            baseFeeMinor: outlet?.deliveryBaseFeeMinor ?? undefined,
            pricePerKmMinor: outlet?.deliveryPricePerKmMinor ?? undefined,
            locationFees: outlet?.deliveryLocationFees ?? undefined,
            outletLatitude: outlet?.latitude ?? undefined,
            outletLongitude: outlet?.longitude ?? undefined,
            deliveryLatitude: options.deliveryLatitude ?? undefined,
            deliveryLongitude: options.deliveryLongitude ?? undefined,
            zoneId: options.zoneId ?? undefined,
            zoneName: options.zoneName ?? undefined,
            fallbackFeeMinor: charges.deliveryFeeMinor,
          });
          return sum + fee;
        }, 0);

  const service = charges.serviceFeeMinor;
  const total = subtotal + commission + vat + delivery + service;

  return { subtotal, commission, vat, delivery, service, total, groupSubtotals };
}

/** Calculate all fees from subtotal + platform charges (all values in minor units / kobo). */
export function calcCharges(
  subtotalMinor: number,
  charges: {
    platformCommissionBps: number;
    defaultVatBps: number;
    deliveryFeeMinor: number;
    serviceFeeMinor: number;
  },
  options: { includeDelivery?: boolean } = {},
) {
  const commission = Math.round((subtotalMinor * charges.platformCommissionBps) / 10_000);
  const vat = Math.round((subtotalMinor * charges.defaultVatBps) / 10_000);
  const delivery = options.includeDelivery === false ? 0 : charges.deliveryFeeMinor;
  const service = charges.serviceFeeMinor;
  const total = subtotalMinor + commission + vat + delivery + service;
  return { commission, vat, delivery, service, total };
}
