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
import { NotificationsModule } from "./notifications/notifications.module";
import { PaymentsModule } from "./payments/payments.module";
import { RedisModule } from "./redis/redis.module";
import { DeliveryModule } from "./delivery/delivery.module";
import { RidersModule } from "./riders/riders.module";
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
    NotificationsModule,
    RidersModule,
    PaymentsModule,
    HealthModule,
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes("{*path}");
  }
}
