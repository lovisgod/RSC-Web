import { describe, expect, it } from "vitest";
import { ObservabilityService } from "./observability.service";

describe("ObservabilityService", () => {
  it("normalizes route parameters to prevent cardinality explosion", () => {
    const service = new ObservabilityService();

    expect(
      service.normalizeRoute("/api/v1/outlets/5a3b5ea5-1bec-4e67-9678-3455b781aea8/menu-items"),
    ).toBe("/api/v1/outlets/:id/menu-items");

    expect(
      service.normalizeRoute(
        "/api/v1/payments/verify/pmt_master_879b0a90-b2de-46f0-8114-f4176ab8c4ff",
      ),
    ).toBe("/api/v1/payments/verify/:id");

    expect(
      service.normalizeRoute(
        "/api/v1/payments/verify/Dineout-3b691b94-7de1-48c1-9861-37f2c73df210",
      ),
    ).toBe("/api/v1/payments/verify/:id");

    expect(service.normalizeRoute("/api/v1/orders/12345/status?detail=true")).toBe(
      "/api/v1/orders/:id/status",
    );
  });

  it("records HTTP requests in Prometheus registry", async () => {
    const service = new ObservabilityService();

    service.recordHttpRequest("GET", "/api/v1/outlets", 200, 0.045);
    service.recordHttpRequest("POST", "/api/v1/payments/initiate", 201, 0.32);
    service.recordHttpRequest("GET", "/api/v1/unknown", 404, 0.005);

    const metrics = await service.getMetrics();

    expect(metrics).toContain("dineout_http_requests_total");
    expect(metrics).toContain('method="GET"');
    expect(metrics).toContain('route="/api/v1/outlets"');
    expect(metrics).toContain('status_code="200"');

    expect(metrics).toContain("dineout_http_request_duration_seconds");
    expect(metrics).toContain("dineout_process_cpu_user_seconds_total");
  });
});
