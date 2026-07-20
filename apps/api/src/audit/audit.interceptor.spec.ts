import { BadRequestException, type CallHandler, type ExecutionContext } from "@nestjs/common";
import type { Request, Response } from "express";
import { throwError, of, lastValueFrom } from "rxjs";
import { describe, expect, it, vi } from "vitest";

import { UserRole } from "../auth/user-role.enum";
import { AuditInterceptor } from "./audit.interceptor";
import type { AuditService } from "./audit.service";

describe(AuditInterceptor.name, () => {
  it("records successful mutating requests with redacted sensitive metadata", async () => {
    const audit = { record: vi.fn().mockResolvedValue(undefined) };
    const interceptor = new AuditInterceptor(audit as unknown as AuditService);
    const request = {
      method: "PATCH",
      originalUrl: "/api/v1/users/riders/721da55a-e320-410e-a22a-f88fb66d6d45?include=email",
      params: { id: "721da55a-e320-410e-a22a-f88fb66d6d45" },
      query: { include: "email" },
      body: {
        name: "Rider Joe",
        email: "joe@example.com",
        phone: "08033333333",
        password: "Secret123!",
        nested: { token: "fcm-token" },
      },
      user: {
        id: "31a2df7e-7f2a-4433-9d5e-1caad0f91c4d",
        role: UserRole.SUPER_ADMIN,
        sessionId: "session-1",
        accessTokenId: "access-token-1",
      },
      ip: "127.0.0.1",
      socket: { remoteAddress: "127.0.0.1" },
      header: vi.fn((name: string) => (name === "user-agent" ? "Vitest" : undefined)),
    } as unknown as Request;
    const response = {
      statusCode: 200,
      getHeader: vi.fn((name: string) => (name === "x-request-id" ? "request-1" : undefined)),
    } as unknown as Response;
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
    const next = { handle: () => of({ ok: true }) } as CallHandler;

    await lastValueFrom(interceptor.intercept(context, next));

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "31a2df7e-7f2a-4433-9d5e-1caad0f91c4d",
        actorRole: UserRole.SUPER_ADMIN,
        action: "PATCH /api/v1/users/riders/721da55a-e320-410e-a22a-f88fb66d6d45",
        method: "PATCH",
        resourceType: "users",
        resourceId: "721da55a-e320-410e-a22a-f88fb66d6d45",
        requestId: "request-1",
      }),
    );
    const recorded = audit.record.mock.calls[0]?.[0] as {
      metadata: { body: Record<string, unknown> };
    };
    expect(recorded.metadata.body).toEqual({
      name: "Rider Joe",
      email: "[REDACTED]",
      phone: "[REDACTED]",
      password: "[REDACTED]",
      nested: { token: "[REDACTED]" },
    });
  });

  it("does not audit read-only requests", async () => {
    const audit = { record: vi.fn().mockResolvedValue(undefined) };
    const interceptor = new AuditInterceptor(audit as unknown as AuditService);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ method: "GET" }),
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;

    await lastValueFrom(interceptor.intercept(context, { handle: () => of({ ok: true }) }));

    expect(audit.record).not.toHaveBeenCalled();
  });

  it("records failed mutating requests with the error status", async () => {
    const audit = { record: vi.fn().mockResolvedValue(undefined) };
    const interceptor = new AuditInterceptor(audit as unknown as AuditService);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: "POST",
          originalUrl: "/api/v1/payments/initiate",
          params: {},
          query: {},
          body: { promoCode: "JAYJAY" },
          header: vi.fn(),
          socket: {},
        }),
        getResponse: () => ({
          statusCode: 201,
          getHeader: vi.fn(),
        }),
      }),
    } as unknown as ExecutionContext;
    const error = new BadRequestException("Total mismatch");

    await expect(
      lastValueFrom(interceptor.intercept(context, { handle: () => throwError(() => error) })),
    ).rejects.toBe(error);

    const recorded = audit.record.mock.calls[0]?.[0] as {
      action: string;
      statusCode: number;
      metadata: { error: { name: string; message: string } };
    };
    expect(recorded.action).toBe("POST /api/v1/payments/initiate");
    expect(recorded.statusCode).toBe(400);
    expect(recorded.metadata.error).toEqual({
      name: "BadRequestException",
      message: "Total mismatch",
    });
  });
});
