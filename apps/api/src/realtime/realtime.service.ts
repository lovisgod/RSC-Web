import { Injectable } from "@nestjs/common";
import type { Server } from "socket.io";

import type { MasterOrderStatus } from "../orders/order-status.enum";
import type { LatestLocation } from "../orders/orders.service";
import type { MasterOrder } from "../orders/master-order.entity";
import type { OrderLineItem } from "../orders/order-line-item.entity";
import type { SubOrder } from "../orders/sub-order.entity";
import type { PreparationSuggestion } from "../catalog/preparation-suggestion.entity";

export interface OrderStatusUpdateEvent {
  masterOrderId: string;
  customerId: string;
  riderId: string | null;
  status: MasterOrderStatus;
  updatedAt: Date;
  riderLocationTracking?: "START" | "STOP";
}

export type RiderLocationUpdateEvent = LatestLocation;

export interface OutletStatusUpdateEvent {
  outletId: string;
  isOnline: boolean;
  updatedAt: Date;
}

export interface MenuItemAvailabilityUpdateEvent {
  menuItemId: string;
  outletId: string;
  isAvailable: boolean;
  updatedAt: Date;
}

export interface RealtimeNotificationEvent {
  id?: string;
  recipientId?: string;
  recipientRole?: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  createdAt?: Date | string;
}

export interface ConfirmedSubOrderEvent {
  masterOrderId: string;
  subOrderId: string;
  outletId: string;
  status: MasterOrderStatus;
  order: MasterOrder;
  subOrder: SubOrder;
  lineItems: OrderLineItem[];
}

@Injectable()
export class RealtimeService {
  private server: Server | null = null;

  bindServer(server: Server): void {
    this.server = server;
  }

  emitOrderStatusUpdate(event: OrderStatusUpdateEvent): void {
    this.server?.to(orderRoom(event.masterOrderId)).emit("order:status_update", event);

    if (event.riderId) {
      this.server?.to(riderRoom(event.riderId)).emit("order:status_update", event);
    }
  }

  emitSuborderNew(subOrder: SubOrder): void {
    this.server?.to(outletRoom(subOrder.outletId)).emit("suborder:new", subOrder);
    this.server?.to(platformAdminRoom()).emit("suborder:new", subOrder);
  }

  emitSuborderConfirmed(event: ConfirmedSubOrderEvent): void {
    this.server?.to(outletRoom(event.outletId)).emit("suborder:confirmed", event);
    this.server?.to(platformAdminRoom()).emit("suborder:confirmed", event);
  }

  emitAdminNotification(event: RealtimeNotificationEvent, outletIds: string[] = []): void {
    this.server?.to(platformAdminRoom()).emit("notification:new", event);

    for (const outletId of outletIds) {
      this.server?.to(outletRoom(outletId)).emit("notification:new", event);
    }
  }

  emitRiderLocationUpdate(event: RiderLocationUpdateEvent): void {
    if (event.masterOrderId) {
      this.server?.to(orderRoom(event.masterOrderId)).emit("rider:location_update", event);
    }

    this.server?.to(riderRoom(event.riderId)).emit("rider:location_update", event);
    this.server?.to(platformAdminRoom()).emit("rider:location_update", event);
  }

  emitOutletStatusUpdate(event: OutletStatusUpdateEvent): void {
    this.server?.emit("outlet:status_update", event);
  }

  emitMenuItemAvailabilityUpdate(event: MenuItemAvailabilityUpdateEvent): void {
    this.server?.emit("menu_item:availability_update", event);
  }

  emitPreparationSuggestionCreated(suggestion: PreparationSuggestion): void {
    this.server?.emit("preparation_suggestion:created", suggestion);
  }

  emitPreparationSuggestionUpdated(suggestion: PreparationSuggestion): void {
    this.server?.emit("preparation_suggestion:updated", suggestion);
  }

  emitPreparationSuggestionDeleted(id: string): void {
    this.server?.emit("preparation_suggestion:deleted", { id });
  }
}

export function orderRoom(masterOrderId: string): string {
  return `order:${masterOrderId}`;
}

export function outletRoom(outletId: string): string {
  return `outlet:${outletId}`;
}

export function riderRoom(riderId: string): string {
  return `rider:${riderId}`;
}

export function platformAdminRoom(): string {
  return "platform:admin";
}
