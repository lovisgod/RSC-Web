import type { Server } from "node:http";

import type { INestApplication } from "@nestjs/common";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { AuthController } from "../src/auth/auth.controller";
import { AuthService } from "../src/auth/auth.service";
import { CustomerStatus } from "../src/auth/customer-status.enum";
import { ApiExceptionFilter } from "../src/common/http/api-exception.filter";
import { ApiResponseInterceptor } from "../src/common/http/api-response.interceptor";

describe("Customer registration HTTP contract", () => {
  let app: INestApplication;
  const authService = {
    register: vi.fn().mockResolvedValue({
      customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
      status: CustomerStatus.UNVERIFIED,
      otpExpiresInSeconds: 600,
    }),
    verifyPhone: vi.fn().mockResolvedValue({
      customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
      status: CustomerStatus.ACTIVE,
      phoneVerifiedAt: "2026-06-23T10:00:00.000Z",
    }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix("api");
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    app.useGlobalInterceptors(new ApiResponseInterceptor(app.get(Reflector)));
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("registers a valid Nigerian customer", async () => {
    const response = await request(app.getHttpServer() as Server)
      .post("/api/v1/auth/register")
      .send({
        name: "Ada Okafor",
        phone: "08031234567",
        email: "ADA@EXAMPLE.COM",
        password: "SecureP@ss1",
      })
      .expect(201);

    expect(response.body).toEqual({
      data: {
        customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
        status: "UNVERIFIED",
        otpExpiresInSeconds: 600,
      },
      message: "Customer registered; verification code sent",
      status: 201,
    });
    expect(authService.register).toHaveBeenCalledWith({
      name: "Ada Okafor",
      phone: "08031234567",
      email: "ada@example.com",
      password: "SecureP@ss1",
    });
  });

  it("rejects invalid or unexpected registration fields", async () => {
    const response = await request(app.getHttpServer() as Server)
      .post("/api/v1/auth/register")
      .send({
        name: "A",
        phone: "1234",
        email: "not-an-email",
        role: "SUPER_ADMIN",
      })
      .expect(400);
    const body = response.body as {
      data?: { errors?: unknown; path?: unknown };
      message?: unknown;
      status?: unknown;
    };

    expect(body.data?.errors).toBeInstanceOf(Array);
    expect(body.data?.path).toBe("/api/v1/auth/register");
    expect(body.message).toBeTypeOf("string");
    expect(body.status).toBe(400);
  });

  it("verifies a six-digit phone OTP", async () => {
    await request(app.getHttpServer() as Server)
      .post("/api/v1/auth/verify-phone")
      .send({ phone: "+2348031234567", code: "482901" })
      .expect(200)
      .expect({
        data: {
          customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
          status: "ACTIVE",
          phoneVerifiedAt: "2026-06-23T10:00:00.000Z",
        },
        message: "Phone verified successfully",
        status: 200,
      });
  });

  it("rejects non-six-digit OTP values", async () => {
    await request(app.getHttpServer() as Server)
      .post("/api/v1/auth/verify-phone")
      .send({ phone: "08031234567", code: "12345" })
      .expect(400);
  });
});
