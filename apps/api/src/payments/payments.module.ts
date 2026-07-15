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
import { NotificationsModule } from "../notifications/notifications.module";
import { Promo } from "../notifications/promo.entity";
import type { ApplicationConfig } from "../config/configuration";
import { LocalPaymentAdapter } from "./local-payment.adapter";
import { PAYMENT_ADAPTER } from "./payment-adapter";
import { Payment } from "./payment.entity";
import { PaymentRefund } from "./payment-refund.entity";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PaystackPaymentAdapter } from "./paystack-payment.adapter";
import { MomentPaymentAdapter } from "./moment-payment.adapter";

@Module({
  imports: [
    AuthModule,
    DeliveryModule,
    NotificationsModule,
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
      PaymentRefund,
      Promo,
    ]),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    LocalPaymentAdapter,
    PaystackPaymentAdapter,
    MomentPaymentAdapter,
    {
      provide: PAYMENT_ADAPTER,
      inject: [ConfigService, LocalPaymentAdapter, PaystackPaymentAdapter, MomentPaymentAdapter],
      useFactory: (
        configService: ConfigService<ApplicationConfig, true>,
        local: LocalPaymentAdapter,
        paystack: PaystackPaymentAdapter,
        moment: MomentPaymentAdapter,
      ) => {
        const payments = configService.get("payments", { infer: true });

        if (payments.provider === "paystack" && payments.paystack.secretKey) {
          return paystack;
        }
        if (payments.provider === "moment" && payments.moment.secretKey) {
          return moment;
        }
        return local;
      },
    },
  ],
  exports: [PaymentsService, PAYMENT_ADAPTER],
})
export class PaymentsModule {}
