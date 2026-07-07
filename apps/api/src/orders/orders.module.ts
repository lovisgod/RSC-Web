import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "../auth/auth.module";
import { Customer } from "../auth/customer.entity";
import { NotificationsModule } from "../notifications/notifications.module";
import { Outlet } from "../outlets/outlet.entity";
import { PaymentsModule } from "../payments/payments.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { MasterOrder } from "./master-order.entity";
import { OrderLineItem } from "./order-line-item.entity";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { OrderStatusEvent } from "./order-status-event.entity";
import { SubOrder } from "./sub-order.entity";

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    PaymentsModule,
    RealtimeModule,
    TypeOrmModule.forFeature([
      Customer,
      Outlet,
      MasterOrder,
      SubOrder,
      OrderLineItem,
      OrderStatusEvent,
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
