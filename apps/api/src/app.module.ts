import { MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { CatalogModule } from "./catalog/catalog.module";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";
import { SecurityModule } from "./common/security/security.module";
import configuration from "./config/configuration";
import { validateEnvironment } from "./config/environment";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { MediaModule } from "./media/media.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { OrdersModule } from "./orders/orders.module";
import { PaymentsModule } from "./payments/payments.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { RedisModule } from "./redis/redis.module";
import { DeliveryModule } from "./delivery/delivery.module";
import { RidersModule } from "./riders/riders.module";
import { StatsModule } from "./stats/stats.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnvironment,
    }),
    DatabaseModule,
    RedisModule,
    SecurityModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    DeliveryModule,
    MediaModule,
    NotificationsModule,
    RidersModule,
    StatsModule,
    RealtimeModule,
    PaymentsModule,
    OrdersModule,
    HealthModule,
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes("{*path}");
  }
}
