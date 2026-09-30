import { Controller, Get, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { RawResponse } from "../common/http/raw-response.decorator";
import { ObservabilityService } from "./observability.service";

@ApiTags("Observability")
@Controller({ path: "observability", version: "1" })
export class ObservabilityController {
  constructor(private readonly observability: ObservabilityService) {}

  @Get("metrics")
  @RawResponse()
  @ApiOperation({ summary: "Prometheus metrics scrape endpoint for monitoring and SLO tracking" })
  async getMetrics(@Res() res: Response): Promise<void> {
    const metrics = await this.observability.getMetrics();
    res.setHeader("Content-Type", this.observability.getContentType());
    res.status(200).send(metrics);
  }

  @Get("summary")
  @ApiOperation({ summary: "JSON summary of current observability collector status" })
  getSummary() {
    return {
      status: "active",
      prefix: "dineout_",
      metricsRegistered: [
        "dineout_http_requests_total",
        "dineout_http_request_duration_seconds",
        "dineout_orders_created_total",
        "dineout_payment_sessions_total",
        "dineout_payment_amount_minor_total",
        "dineout_payment_webhook_events_total",
      ],
      timestamp: new Date().toISOString(),
    };
  }
}
