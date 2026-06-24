import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { ApiMessage } from "./common/http/api-message.decorator";
import type { ApplicationConfig } from "./config/configuration";

@ApiTags("platform")
@Controller({ version: "1" })
export class AppController {
  constructor(private readonly configService: ConfigService<ApplicationConfig, true>) {}

  @Get()
  @ApiMessage("API metadata retrieved")
  @ApiOperation({ summary: "API service metadata" })
  info() {
    return {
      service: "rsc-api",
      version: this.configService.get("app.version", { infer: true }),
      environment: this.configService.get("app.environment", { infer: true }),
    };
  }
}
