import { Logger, ValidationPipe, VersioningType } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import compression from "compression";
import helmet from "helmet";

import type { ApplicationConfig } from "./config/configuration";
import { ApiExceptionFilter } from "./common/http/api-exception.filter";
import { ApiResponseInterceptor } from "./common/http/api-response.interceptor";

export function configureApplication(app: INestApplication): void {
  const configService = app.get(ConfigService<ApplicationConfig, true>);
  const { corsOrigins, swaggerEnabled, version } = configService.get("app", {
    infer: true,
  });

  app.use(helmet());
  app.use(compression());
  app.enableCors({
    credentials: true,
    origin: corsOrigins,
  });
  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalInterceptors(new ApiResponseInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("RSC Platform API")
      .setDescription("Backend API for the RSC multi-outlet food ordering platform.")
      .setVersion(version)
      .addBearerAuth()
      .build();
    const documentFactory = () => SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup("api/docs", app, documentFactory, {
      jsonDocumentUrl: "api/openapi.json",
    });
  }

  app.useLogger(new Logger("RSC API"));
}
