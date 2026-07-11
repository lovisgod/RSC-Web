export type FulfillmentMode = "delivery" | "takeout";

export interface DeliveryZone {
  id: string;
  name: string;
}

export interface DeliveryForm {
  mode: FulfillmentMode;
  address: string;
  latitude: number | null;
  longitude: number | null;
  zone: DeliveryZone | null;
  onBehalf: boolean;
  recipientPhone: string;
  instructions: string;
}

export interface PaymentMethod {
  id: string;
  label: string;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: "card-0241", label: "Visa ending 0241 — Default" },
  { id: "bank-transfer", label: "Bank transfer" },
  { id: "ussd", label: "Pay with USSD" },
  { id: "new-card", label: "Add new card" },
];

export const DEFAULT_DELIVERY: DeliveryForm = {
  mode: "delivery",
  address: "12 Admiralty Way, Lekki Phase 1, Lagos",
  latitude: null,
  longitude: null,
  zone: null,
  onBehalf: false,
  recipientPhone: "",
  instructions: "",
};

// Review step is merged into Fulfillment
export const CHECKOUT_STEPS = ["Cart", "Fulfillment", "Payment", "Confirmation"] as const;

export const VAT_RATE = 0.075;

/** Snapshot of cart + server totals captured at payment initiation.
 *  Keeps the sidebar populated after the local cart is cleared. */
export interface OrderSnapshot {
  groups: Array<{
    outletId: string;
    outletName: string;
    items: Array<{
      lineId?: string;
      id: string;
      name: string;
      quantity: number;
      notes: string;
      unitPriceMinor: number;
    }>;
  }>;
  totals: {
    subtotalMinor: number;
    deliveryFeeMinor: number;
    serviceFeeMinor: number;
    vatMinor: number;
    totalMinor: number;
  };
}
