import { Injectable } from "@nestjs/common";
import type { Server } from "socket.io";

import type { MasterOrderStatus } from "../orders/order-status.enum";
import type { LatestLocation } from "../orders/orders.service";
import type { SubOrder } from "../orders/sub-order.entity";

export interface OrderStatusUpdateEvent {
  masterOrderId: string;
  customerId: string;
  riderId: string | null;
  status: MasterOrderStatus;
  updatedAt: Date;
}

export type RiderLocationUpdateEvent = LatestLocation;

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

  emitRiderLocationUpdate(event: RiderLocationUpdateEvent): void {
    if (event.masterOrderId) {
      this.server?.to(orderRoom(event.masterOrderId)).emit("rider:location_update", event);
    }

    this.server?.to(riderRoom(event.riderId)).emit("rider:location_update", event);
    this.server?.to(platformAdminRoom()).emit("rider:location_update", event);
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
