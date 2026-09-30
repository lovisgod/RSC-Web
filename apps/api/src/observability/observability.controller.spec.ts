import { describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import { ObservabilityController } from "./observability.controller";
import { ObservabilityService } from "./observability.service";

describe("ObservabilityController", () => {
  it("returns metrics with prometheus text content type", async () => {
    const service = new ObservabilityService();
    const controller = new ObservabilityController(service);

    const setHeader = vi.fn();
    const send = vi.fn();
    const res = {
      setHeader,
      status: vi.fn().mockReturnThis(),
      send,
    } as unknown as Response;

    await controller.getMetrics(res);

    expect(setHeader).toHaveBeenCalledWith("Content-Type", expect.stringContaining("text/plain"));
    expect(send).toHaveBeenCalledWith(expect.stringContaining("dineout_"));
  });

  it("returns collector summary", () => {
    const service = new ObservabilityService();
    const controller = new ObservabilityController(service);

    const summary = controller.getSummary();
    expect(summary.status).toBe("active");
    expect(summary.prefix).toBe("dineout_");
    expect(summary.metricsRegistered).toContain("dineout_http_requests_total");
  });
});
