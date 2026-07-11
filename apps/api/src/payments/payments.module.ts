import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "../auth/auth.module";
import { Customer } from "../auth/customer.entity";
import { ItemModifier } from "../catalog/item-modifier.entity";
import { MenuItem } from "../catalog/menu-item.entity";
import { DeliveryModule } from "../delivery/delivery.module";
import { MasterOrder } from "../orders/master-order.entity";
import { OrderLineItem } from "../orders/order-line-item.entity";
import { SubOrder } from "../orders/sub-order.entity";
import { Outlet } from "../outlets/outlet.entity";
import { RealtimeModule } from "../realtime/realtime.module";
import type { ApplicationConfig } from "../config/configuration";
import { LocalPaymentAdapter } from "./local-payment.adapter";
import { PAYMENT_ADAPTER } from "./payment-adapter";
import { Payment } from "./payment.entity";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PaystackPaymentAdapter } from "./paystack-payment.adapter";

@Module({
  imports: [
    AuthModule,
    DeliveryModule,
    RealtimeModule,
    TypeOrmModule.forFeature([
      Customer,
      MenuItem,
      ItemModifier,
      Outlet,
      MasterOrder,
      SubOrder,
      OrderLineItem,
      Payment,
    ]),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    LocalPaymentAdapter,
    PaystackPaymentAdapter,
    {
      provide: PAYMENT_ADAPTER,
      inject: [ConfigService, LocalPaymentAdapter, PaystackPaymentAdapter],
      useFactory: (
        configService: ConfigService<ApplicationConfig, true>,
        local: LocalPaymentAdapter,
        paystack: PaystackPaymentAdapter,
      ) => {
        const payments = configService.get("payments", { infer: true });

        return payments.provider === "paystack" && payments.paystack.secretKey ? paystack : local;
      },
    },
  ],
  exports: [PaymentsService, PAYMENT_ADAPTER],
})
export class PaymentsModule {}
