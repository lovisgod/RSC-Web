import { describe, expect, it } from "vitest";
import { formatMoney, formatNaira, hasKobo } from "./money";

describe("money helpers", () => {
  describe("hasKobo", () => {
    it("returns false for whole naira amounts", () => {
      expect(hasKobo(0)).toBe(false);
      expect(hasKobo(100)).toBe(false);
      expect(hasKobo(1735000)).toBe(false);
    });

    it("returns true when kobo fraction is present", () => {
      expect(hasKobo(50)).toBe(true);
      expect(hasKobo(130125)).toBe(true);
      expect(hasKobo(86750)).toBe(true);
    });
  });

  describe("formatNaira", () => {
    it("formats whole naira without decimal kobo digits", () => {
      expect(formatNaira(0)).toBe("₦0");
      expect(formatNaira(1735000)).toBe("₦17,350");
    });

    it("formats amounts with kobo with two decimal places", () => {
      expect(formatNaira(130125)).toBe("₦1,301.25");
      expect(formatNaira(86750)).toBe("₦867.50");
    });
  });

  describe("formatMoney", () => {
    it("formats Money objects correctly", () => {
      expect(formatMoney({ amountMinor: 1735000, currency: "NGN" })).toBe("₦17,350");
      expect(formatMoney({ amountMinor: 130125, currency: "NGN" })).toBe("₦1,301.25");
    });
  });
});
