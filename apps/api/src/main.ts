import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { configureApplication } from "./bootstrap";
import type { ApplicationConfig } from "./config/configuration";

function maskUrl(value: string): string {
  if (!value) {
    return value;
  }

  try {
    const url = new URL(value);

    if (url.password) {
      url.password = "***";
    }

    return url.toString();
  } catch {
    return value.replace(/:(.+)@/, ":***@");
  }
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  configureApplication(app);

  const configService = app.get(ConfigService<ApplicationConfig, true>);
  const port = configService.get("app.port", { infer: true });
  const appConfig = configService.get("app", { infer: true });
  const database = configService.get("database", { infer: true });
  const redis = configService.get("redis", { infer: true });
  const sms = configService.get("sms", { infer: true });

  await app.listen(port, "0.0.0.0");

  Logger.log(
    `Runtime connections: ${JSON.stringify({
      environment: appConfig.environment,
      databaseUrl: maskUrl(database.url),
      redisUrl: maskUrl(redis.url),
      smsProvider: sms.provider,
      termiiBaseUrl: sms.termii.baseUrl,
      termiiSenderId: sms.termii.senderId,
      termiiChannel: sms.termii.channel,
      termiiApiKeySet: sms.termii.apiKey.length > 0,
      emailProvider: configService.get("email.provider", { infer: true }),
      smtpHost: configService.get("email.smtp.host", { infer: true }),
      smtpPort: configService.get("email.smtp.port", { infer: true }),
      smtpUserSet: configService.get("email.smtp.user", { infer: true }).length > 0,
    })}`,
    "Bootstrap",
  );
  Logger.log(`RSC API listening on http://localhost:${port}/api/v1`, "Bootstrap");
}

void bootstrap();
