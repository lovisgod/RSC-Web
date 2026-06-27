export type FulfillmentMode = "delivery" | "takeout";

export interface DeliveryForm {
  mode: FulfillmentMode;
  address: string;
  onBehalf: boolean;
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
  onBehalf: false,
  instructions: "",
};

// Review step is merged into Fulfillment
export const CHECKOUT_STEPS = ["Cart", "Fulfillment", "Payment", "Confirmation"] as const;

export const VAT_RATE = 0.075;
