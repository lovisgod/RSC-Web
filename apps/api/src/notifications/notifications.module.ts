import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import type { ApplicationConfig } from "../config/configuration";
import { AuthModule } from "../auth/auth.module";
import { Customer } from "../auth/customer.entity";
import { FirebasePushSender } from "./firebase-push.sender";
import { NoopPushSender } from "./noop-push.sender";
import { Notification } from "./notification.entity";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { PUSH_SENDER } from "./push-sender";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Notification, Customer])],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NoopPushSender,
    FirebasePushSender,
    {
      provide: PUSH_SENDER,
      inject: [ConfigService, NoopPushSender, FirebasePushSender],
      useFactory: (
        configService: ConfigService<ApplicationConfig, true>,
        noop: NoopPushSender,
        firebase: FirebasePushSender,
      ) => (configService.get("push.provider", { infer: true }) === "firebase" ? firebase : noop),
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
