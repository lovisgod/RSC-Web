import { MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AppController } from "./app.controller";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";
import configuration from "./config/configuration";
import { validateEnvironment } from "./config/environment";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { RedisModule } from "./redis/redis.module";

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
    HealthModule,
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
