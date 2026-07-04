import { ServiceUnavailableException } from "@nestjs/common";
import type { ArgumentsHost } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { ApiExceptionFilter } from "./api-exception.filter";

describe(ApiExceptionFilter.name, () => {
  it("preserves health indicator messages in the standard error envelope", () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({ originalUrl: "/api/v1/health/ready" }),
        getResponse: () => ({
          getHeader: () => "request-1",
          status,
        }),
      }),
    } as unknown as ArgumentsHost;
    const exception = new ServiceUnavailableException({
      status: "error",
      error: {
        redis: {
          status: "down",
          message: "connect ECONNREFUSED 127.0.0.1:6379",
        },
      },
    });

    new ApiExceptionFilter().catch(exception, host);

    expect(status).toHaveBeenCalledWith(503);
    const payload = json.mock.calls[0]?.[0] as {
      data: { errors: string[] };
      message: string;
      status: number;
    };

    expect(payload.data.errors).toEqual(["redis: connect ECONNREFUSED 127.0.0.1:6379"]);
    expect(payload.message).toBe("redis: connect ECONNREFUSED 127.0.0.1:6379");
    expect(payload.status).toBe(503);
  });
});
