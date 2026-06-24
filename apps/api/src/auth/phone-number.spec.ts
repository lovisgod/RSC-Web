import { describe, expect, it } from "vitest";

import { normalizeNigerianPhoneNumber } from "./phone-number";

describe("normalizeNigerianPhoneNumber", () => {
  it.each([
    ["08031234567", "2348031234567"],
    ["2348031234567", "2348031234567"],
    ["+2348031234567", "2348031234567"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeNigerianPhoneNumber(input)).toBe(expected);
  });

  it.each(["070123", "2346031234567", "12345678901"])("rejects %s", (input) => {
    expect(() => normalizeNigerianPhoneNumber(input)).toThrow(
      "Phone number must be a valid Nigerian mobile number",
    );
  });
});
