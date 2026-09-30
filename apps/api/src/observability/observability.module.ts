import { Global, MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ObservabilityController } from "./observability.controller";
import { ObservabilityMiddleware } from "./observability.middleware";
import { ObservabilityService } from "./observability.service";

@Global()
@Module({
  controllers: [ObservabilityController],
  providers: [ObservabilityService],
  exports: [ObservabilityService],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ObservabilityMiddleware).forRoutes("*");
  }
}
