import { z } from "zod";

export const currencySchema = z.literal("NGN");

export const moneySchema = z.object({
  amountMinor: z.int().nonnegative(),
  currency: currencySchema,
});

export const outletSummarySchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  cuisineType: z.string().min(1),
  description: z.string().nullable(),
  imageUrl: z.url().nullable(),
  isOnline: z.boolean(),
});

export const masterOrderStatusSchema = z.enum([
  "PENDING_PAYMENT",
  "CONFIRMED",
  "PARTIALLY_READY",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
]);

export const subOrderStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "COLLECTED",
  "DISPATCHED",
  "REJECTED",
]);

export const adminOverviewSchema = z.object({
  generatedAt: z.iso.datetime(),
  activeOutlets: z.int().nonnegative(),
  openMasterOrders: z.int().nonnegative(),
  delayedSubOrders: z.int().nonnegative(),
  pendingSettlements: moneySchema,
});

export type Money = z.infer<typeof moneySchema>;
export type OutletSummary = z.infer<typeof outletSummarySchema>;
export type MasterOrderStatus = z.infer<typeof masterOrderStatusSchema>;
export type SubOrderStatus = z.infer<typeof subOrderStatusSchema>;
export type AdminOverview = z.infer<typeof adminOverviewSchema>;
