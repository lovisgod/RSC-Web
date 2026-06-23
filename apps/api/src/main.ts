import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { configureApplication } from "./bootstrap";
import type { ApplicationConfig } from "./config/configuration";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  configureApplication(app);

  const configService = app.get(ConfigService<ApplicationConfig, true>);
  const port = configService.get("app.port", { infer: true });

  await app.listen(port, "0.0.0.0");

  Logger.log(`RSC API listening on http://localhost:${port}/api/v1`, "Bootstrap");
}

void bootstrap();
