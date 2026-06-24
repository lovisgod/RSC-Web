import { describe, expect, it } from "vitest";

import {
  moneySchema,
  phoneVerificationResultSchema,
  registerCustomerInputSchema,
  registrationResultSchema,
  verifyPhoneInputSchema,
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
      }),
    ).toEqual({
      name: "Ada Okafor",
      phone: "08031234567",
      email: "ada@example.com",
    });
  });

  it("rejects extra registration fields", () => {
    expect(() =>
      registerCustomerInputSchema.parse({
        name: "Ada Okafor",
        phone: "08031234567",
        email: "ada@example.com",
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
      }),
    ).toBeTruthy();
    expect(
      phoneVerificationResultSchema.parse({
        customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
        status: "ACTIVE",
        phoneVerifiedAt: "2026-06-23T10:00:00.000Z",
      }),
    ).toBeTruthy();
  });

  it("requires a six-digit verification code", () => {
    expect(() => verifyPhoneInputSchema.parse({ phone: "08031234567", code: "12345" })).toThrow();
  });
});
