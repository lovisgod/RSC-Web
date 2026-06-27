export type OrderStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "PREPARING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export interface Order {
  id: string;
  status: OrderStatus;
  kitchens: string[];
  deliveryAddress: string;
  createdAt: string;
}

export const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  PENDING_PAYMENT: { label: "Pending payment", color: "#fff", bg: "var(--rsc-danger)" },
  CONFIRMED: { label: "Confirmed", color: "#fff", bg: "var(--rsc-navy-light)" },
  PREPARING: { label: "Preparing", color: "#fff", bg: "var(--rsc-dark)" },
  OUT_FOR_DELIVERY: { label: "Out for delivery", color: "#fff", bg: "var(--rsc-dark)" },
  DELIVERED: { label: "Delivered", color: "#fff", bg: "var(--rsc-main)" },
  CANCELLED: { label: "Cancelled", color: "#fff", bg: "#6b7280" },
};

// Dummy active order — null means no active order
export const DUMMY_ACTIVE_ORDER: Order | null = {
  id: "RSC-482907",
  status: "OUT_FOR_DELIVERY",
  kitchens: ["Cactus", "Salmas"],
  deliveryAddress: "Lekki Phase 1, Lagos",
  createdAt: new Date().toISOString(),
};

// Dummy completed orders
export const DUMMY_COMPLETED_ORDERS: Order[] = [
  {
    id: "RSC-482901",
    status: "DELIVERED",
    kitchens: ["Cactus", "Salmas", "Black Diamond"],
    deliveryAddress: "Lekki Phase 1, Lagos",
    createdAt: "2026-06-20T10:30:00.000Z",
  },
  {
    id: "RSC-482902",
    status: "DELIVERED",
    kitchens: ["Cactus", "Salmas", "Black Diamond"],
    deliveryAddress: "Lekki Phase 1, Lagos",
    createdAt: "2026-06-19T14:15:00.000Z",
  },
  {
    id: "RSC-482903",
    status: "DELIVERED",
    kitchens: ["Cactus", "Salmas", "Black Diamond"],
    deliveryAddress: "Lekki Phase 1, Lagos",
    createdAt: "2026-06-18T09:00:00.000Z",
  },
  {
    id: "RSC-482904",
    status: "DELIVERED",
    kitchens: ["Cactus", "Salmas", "Black Diamond"],
    deliveryAddress: "Lekki Phase 1, Lagos",
    createdAt: "2026-06-17T18:45:00.000Z",
  },
  {
    id: "RSC-482905",
    status: "DELIVERED",
    kitchens: ["Cactus", "Salmas", "Black Diamond"],
    deliveryAddress: "Lekki Phase 1, Lagos",
    createdAt: "2026-06-15T12:20:00.000Z",
  },
  {
    id: "RSC-482906",
    status: "DELIVERED",
    kitchens: ["Cactus", "Salmas", "Black Diamond"],
    deliveryAddress: "Lekki Phase 1, Lagos",
    createdAt: "2026-06-14T16:00:00.000Z",
  },
];
