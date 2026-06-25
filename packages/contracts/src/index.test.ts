import { describe, expect, it } from "vitest";

import {
  adminResultSchema,
  createAdminInputSchema,
  loginInputSchema,
  loginResultSchema,
  moneySchema,
  registrationResponseSchema,
  registerCustomerInputSchema,
  registrationResultSchema,
  userVerificationResultSchema,
  verifyUserInputSchema,
} from "./index";

describe("moneySchema", () => {
  it("accepts non-negative NGN minor units", () => {
    expect(moneySchema.parse({ amountMinor: 125050, currency: "NGN" })).toEqual({
      amountMinor: 125050,
      currency: "NGN",
    });
  });

  it("rejects decimal minor units", () => {
    expect(() => moneySchema.parse({ amountMinor: 12.5, currency: "NGN" })).toThrow();
  });
});

describe("customer registration contracts", () => {
  it("normalizes a valid registration request", () => {
    expect(
      registerCustomerInputSchema.parse({
        name: "  Ada Okafor  ",
        phone: " 08031234567 ",
        email: " ADA@EXAMPLE.COM ",
        password: "SecureP@ss1",
      }),
    ).toEqual({
      name: "Ada Okafor",
      phone: "08031234567",
      email: "ada@example.com",
      password: "SecureP@ss1",
    });
  });

  it("requires a password of at least 8 characters", () => {
    expect(() =>
      registerCustomerInputSchema.parse({
        name: "Ada Okafor",
        phone: "08031234567",
        email: "ada@example.com",
        password: "Abc123",
      }),
    ).toThrow();
  });

  it("rejects extra registration fields", () => {
    expect(() =>
      registerCustomerInputSchema.parse({
        name: "Ada Okafor",
        phone: "08031234567",
        email: "ada@example.com",
        password: "SecureP@ss1",
        role: "SUPER_ADMIN",
      }),
    ).toThrow();
  });

  it("documents both registration responses", () => {
    expect(
      registrationResultSchema.parse({
        customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
        status: "UNVERIFIED",
        otpExpiresInSeconds: 600,
        verificationChannels: { email: false, phone: false },
      }),
    ).toBeTruthy();
    expect(
      registrationResponseSchema.parse({
        data: {
          customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
          status: "UNVERIFIED",
          otpExpiresInSeconds: 600,
          verificationChannels: { email: false, phone: false },
        },
        message: "Customer registered; verification codes sent",
        status: 201,
      }),
    ).toBeTruthy();
    expect(
      userVerificationResultSchema.parse({
        customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
        status: "ACTIVE",
        channel: "email",
        verifiedAt: "2026-06-23T10:00:00.000Z",
        verificationChannels: { email: true, phone: false },
      }),
    ).toBeTruthy();
  });

  it("requires a six-digit verification code", () => {
    expect(() =>
      verifyUserInputSchema.parse({ channel: "phone", phone: "08031234567", code: "12345" }),
    ).toThrow();
    expect(() =>
      verifyUserInputSchema.parse({ channel: "email", email: "ada@example.com", code: "12345" }),
    ).toThrow();
  });

  it("requires the identifier that matches the verification channel", () => {
    expect(() =>
      verifyUserInputSchema.parse({ channel: "phone", email: "ada@example.com", code: "123456" }),
    ).toThrow();
    expect(() =>
      verifyUserInputSchema.parse({ channel: "email", phone: "08031234567", code: "123456" }),
    ).toThrow();
  });

  it("documents login contracts", () => {
    expect(
      loginInputSchema.parse({ identifier: " ADA@EXAMPLE.COM ", password: "SecureP@ss1" }),
    ).toEqual({ identifier: "ada@example.com", password: "SecureP@ss1" });
    expect(
      loginResultSchema.parse({
        user: {
          id: "2abf9577-027c-4936-83a8-e004fd56a46e",
          role: "CUSTOMER",
        },
        accessTokenExpiresInSeconds: 900,
        refreshTokenExpiresInSeconds: 604800,
      }),
    ).toBeTruthy();
  });

  it("documents admin creation contracts", () => {
    expect(
      createAdminInputSchema.parse({
        name: "  Outlet Manager  ",
        email: " MANAGER@EXAMPLE.COM ",
        phone: "08031234567",
        password: "SecureP@ss1",
        outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
      }),
    ).toEqual({
      name: "Outlet Manager",
      email: "manager@example.com",
      phone: "08031234567",
      password: "SecureP@ss1",
      outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
    });
    expect(
      adminResultSchema.parse({
        id: "b709c9f9-7d01-4d84-90d6-50b0ad470bc5",
        name: "Outlet Manager",
        role: "ADMIN",
        outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
      }),
    ).toBeTruthy();
  });
});
