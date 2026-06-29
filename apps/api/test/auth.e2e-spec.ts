import type { Server } from "node:http";

import type { INestApplication } from "@nestjs/common";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { AuthController } from "../src/auth/auth.controller";
import { AuthGuard } from "../src/auth/auth.guard";
import { AuthSessionService } from "../src/auth/auth-session.service";
import { AuthService } from "../src/auth/auth.service";
import { CustomerStatus } from "../src/auth/customer-status.enum";
import { RolesGuard } from "../src/auth/roles.guard";
import { UserRole } from "../src/auth/user-role.enum";
import { ApiExceptionFilter } from "../src/common/http/api-exception.filter";
import { ApiResponseInterceptor } from "../src/common/http/api-response.interceptor";

describe("Customer registration HTTP contract", () => {
  let app: INestApplication;
  const authService = {
    register: vi.fn().mockResolvedValue({
      customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
      status: CustomerStatus.UNVERIFIED,
      otpExpiresInSeconds: 600,
      verificationChannels: { email: false, phone: false },
    }),
    verifyUser: vi.fn().mockResolvedValue({
      customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
      status: CustomerStatus.ACTIVE,
      channel: "phone",
      verifiedAt: "2026-06-23T10:00:00.000Z",
      verificationChannels: { email: false, phone: true },
    }),
    resendVerificationCode: vi.fn().mockResolvedValue({
      sent: true,
      channel: "phone",
      otpExpiresInSeconds: 600,
    }),
    login: vi.fn().mockResolvedValue({
      accessToken: "access.jwt",
      refreshToken: "refresh.jwt",
      accessTokenExpiresInSeconds: 900,
      refreshTokenExpiresInSeconds: 604800,
      user: { id: "2abf9577-027c-4936-83a8-e004fd56a46e", role: UserRole.CUSTOMER },
    }),
    createAdmin: vi.fn().mockResolvedValue({
      id: "b709c9f9-7d01-4d84-90d6-50b0ad470bc5",
      name: "Outlet Manager",
      role: UserRole.ADMIN,
      outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
      temporaryPassword: "e9FPuxWz3zRaAa1!",
    }),
  };
  const sessions = {
    revokeSession: vi.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: AuthSessionService, useValue: sessions },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

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
        verificationChannels: { email: false, phone: false },
      },
      message: "Customer registered; verification codes sent",
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
      .post("/api/v1/auth/verify-user")
      .send({ code: "482901" })
      .expect(200)
      .expect({
        data: {
          customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
          status: "ACTIVE",
          channel: "phone",
          verifiedAt: "2026-06-23T10:00:00.000Z",
          verificationChannels: { email: false, phone: true },
        },
        message: "User verified successfully",
        status: 200,
      });
  });

  it("resends a verification code", async () => {
    await request(app.getHttpServer() as Server)
      .post("/api/v1/auth/resend-verification-code")
      .send({ channel: "phone", phone: "+2348031234567" })
      .expect(200)
      .expect({
        data: {
          sent: true,
          channel: "phone",
          otpExpiresInSeconds: 600,
        },
        message: "Verification code resent",
        status: 200,
      });

    expect(authService.resendVerificationCode).toHaveBeenCalledWith({
      channel: "phone",
      phone: "+2348031234567",
    });
  });

  it("logs in and writes HttpOnly auth cookies", async () => {
    const response = await request(app.getHttpServer() as Server)
      .post("/api/v1/auth/login")
      .send({ identifier: "ADA@EXAMPLE.COM", password: "SecureP@ss1" })
      .expect(200);

    expect(response.body).toEqual({
      data: {
        user: { id: "2abf9577-027c-4936-83a8-e004fd56a46e", role: "CUSTOMER" },
        accessTokenExpiresInSeconds: 900,
        refreshTokenExpiresInSeconds: 604800,
      },
      message: "Login successful",
      status: 200,
    });
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringContaining("accessToken=access.jwt"),
        expect.stringContaining("refreshToken=refresh.jwt"),
      ]),
    );
    expect(authService.login).toHaveBeenCalledWith({
      identifier: "ada@example.com",
      password: "SecureP@ss1",
    });
  });

  it("logs out and revokes the active cookie tokens", async () => {
    const response = await request(app.getHttpServer() as Server)
      .post("/api/v1/auth/logout")
      .set("Cookie", ["accessToken=access.jwt; refreshToken=refresh.jwt"])
      .expect(200);

    expect(response.body).toEqual({
      data: { loggedOut: true },
      message: "Logged out successfully",
      status: 200,
    });
    expect(sessions.revokeSession).toHaveBeenCalledWith("access.jwt", "refresh.jwt");
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringContaining("accessToken=;"),
        expect.stringContaining("refreshToken=;"),
      ]),
    );
  });

  it("creates an outlet admin", async () => {
    await request(app.getHttpServer() as Server)
      .post("/api/v1/auth/admins")
      .send({
        name: "Outlet Manager",
        email: "MANAGER@EXAMPLE.COM",
        phone: "08031234567",
        outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
      })
      .expect(201)
      .expect({
        data: {
          id: "b709c9f9-7d01-4d84-90d6-50b0ad470bc5",
          name: "Outlet Manager",
          role: "ADMIN",
          outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
          temporaryPassword: "e9FPuxWz3zRaAa1!",
        },
        message: "Admin created successfully",
        status: 201,
      });

    expect(authService.createAdmin).toHaveBeenCalledWith({
      name: "Outlet Manager",
      email: "manager@example.com",
      phone: "08031234567",
      outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
    });
  });

  it("verifies a six-digit email OTP", async () => {
    authService.verifyUser.mockResolvedValueOnce({
      customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
      status: CustomerStatus.ACTIVE,
      channel: "email",
      verifiedAt: "2026-06-23T10:00:00.000Z",
      verificationChannels: { email: true, phone: false },
    });

    await request(app.getHttpServer() as Server)
      .post("/api/v1/auth/verify-user")
      .send({ code: "193847" })
      .expect(200)
      .expect({
        data: {
          customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
          status: "ACTIVE",
          channel: "email",
          verifiedAt: "2026-06-23T10:00:00.000Z",
          verificationChannels: { email: true, phone: false },
        },
        message: "User verified successfully",
        status: 200,
      });

    expect(authService.verifyUser).toHaveBeenCalledWith({
      code: "193847",
    });
  });

  it("rejects non-six-digit OTP values", async () => {
    await request(app.getHttpServer() as Server)
      .post("/api/v1/auth/verify-user")
      .send({ code: "12345" })
      .expect(400);
  });
});
