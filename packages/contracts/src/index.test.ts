import { describe, expect, it } from "vitest";

import { moneySchema } from "./index";

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
