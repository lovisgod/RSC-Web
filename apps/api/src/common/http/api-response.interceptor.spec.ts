import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { firstValueFrom, of } from "rxjs";
import { describe, expect, it } from "vitest";

import { ApiResponseInterceptor } from "./api-response.interceptor";

describe(ApiResponseInterceptor.name, () => {
  it("wraps controller data in the standard response envelope", async () => {
    class TestController {}
    const handler = (): void => undefined;

    const context = {
      getClass: () => TestController,
      getHandler: () => handler,
      switchToHttp: () => ({ getResponse: () => ({ statusCode: 201 }) }),
    } as unknown as ExecutionContext;
    const next = { handle: () => of({ id: "customer-1" }) } as CallHandler;
    const interceptor = new ApiResponseInterceptor(new Reflector());

    await expect(firstValueFrom(interceptor.intercept(context, next))).resolves.toEqual({
      data: { id: "customer-1" },
      message: "Request successful",
      status: 201,
    });
  });

  it("bypasses envelope wrapping when RAW_RESPONSE_METADATA is true", async () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = () => true;

    const context = {
      getClass: () => class {},
      getHandler: () => () => undefined,
      switchToHttp: () => ({ getResponse: () => ({ statusCode: 200 }) }),
    } as unknown as ExecutionContext;
    const rawMetrics = "# HELP dineout_http_requests_total\n";
    const next = { handle: () => of(rawMetrics) } as CallHandler;
    const interceptor = new ApiResponseInterceptor(reflector);

    await expect(firstValueFrom(interceptor.intercept(context, next))).resolves.toBe(rawMetrics);
  });
});
