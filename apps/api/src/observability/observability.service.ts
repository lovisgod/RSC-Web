import { Injectable, Logger } from "@nestjs/common";
import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";

@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger(ObservabilityService.name);
  readonly registry: Registry;

  // HTTP RED Metrics
  readonly httpRequestsTotal: Counter<string>;
  readonly httpRequestDurationSeconds: Histogram<string>;

  // Domain Payment & Order Metrics
  readonly ordersCreatedTotal: Counter<string>;
  readonly paymentSessionsTotal: Counter<string>;
  readonly paymentAmountMinorTotal: Counter<string>;
  readonly paymentWebhookEventsTotal: Counter<string>;

  constructor() {
    this.registry = new Registry();

    // Default Node.js / process saturation metrics
    collectDefaultMetrics({
      register: this.registry,
      prefix: "dineout_",
    });

    this.httpRequestsTotal = new Counter({
      name: "dineout_http_requests_total",
      help: "Total incoming HTTP requests partitioned by method, normalized route, and status code",
      labelNames: ["method", "route", "status_code"],
      registers: [this.registry],
    });

    this.httpRequestDurationSeconds = new Histogram({
      name: "dineout_http_request_duration_seconds",
      help: "HTTP request latency duration in seconds",
      labelNames: ["method", "route", "status_code"],
      buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    this.ordersCreatedTotal = new Counter({
      name: "dineout_orders_created_total",
      help: "Total customer orders placed",
      labelNames: ["delivery_mode"],
      registers: [this.registry],
    });

    this.paymentSessionsTotal = new Counter({
      name: "dineout_payment_sessions_total",
      help: "Total outbound payment initiation sessions created with payment providers",
      labelNames: ["gateway", "status"],
      registers: [this.registry],
    });

    this.paymentAmountMinorTotal = new Counter({
      name: "dineout_payment_amount_minor_total",
      help: "Total monetary volume initiated across payment gateways in integer minor units",
      labelNames: ["gateway", "currency"],
      registers: [this.registry],
    });

    this.paymentWebhookEventsTotal = new Counter({
      name: "dineout_payment_webhook_events_total",
      help: "Total incoming payment gateway webhook events received and processed",
      labelNames: ["gateway", "event_type", "status"],
      registers: [this.registry],
    });
  }

  /**
   * Normalizes URLs to bounded cardinality routes by replacing UUIDs, IDs, and numeric tokens with :id.
   * Example: /api/v1/outlets/5a3b5ea5-1bec-4e67-9678-3455b781aea8/menu -> /api/v1/outlets/:id/menu
   */
  normalizeRoute(path: string): string {
    if (!path) return "/";

    const cleanPath = path.split("?")[0] || "/";

    return cleanPath
      .split("/")
      .map((segment) => {
        if (!segment) return "";
        // Standard UUIDs
        if (
          /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
            segment,
          )
        ) {
          return ":id";
        }
        // Purely numeric tokens
        if (/^\d+$/.test(segment)) {
          return ":id";
        }
        // Dynamic prefixed tokens (payments, orders, customers, sessions, Dineout references)
        if (/^(bu_|pmt_|ord_|usr_|ckt_|sub_|ref_|ps_|evt_|Dineout-|RSC-)/i.test(segment)) {
          return ":id";
        }
        return segment;
      })
      .join("/");
  }

  recordHttpRequest(
    method: string,
    rawPath: string,
    statusCode: number,
    durationSeconds: number,
  ): void {
    const route = this.normalizeRoute(rawPath);
    const status = String(statusCode);
    const upperMethod = method.toUpperCase();

    this.httpRequestsTotal.labels(upperMethod, route, status).inc();
    this.httpRequestDurationSeconds.labels(upperMethod, route, status).observe(durationSeconds);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
