import type { Money } from "@rsc/contracts";

export function hasKobo(minor: number): boolean {
  return Math.abs(minor % 100) > 0.001;
}

export function formatNaira(minor: number, locale = "en-NG"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: hasKobo(minor) ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

export function formatMoney(money: Money, locale = "en-NG"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
    minimumFractionDigits: hasKobo(money.amountMinor) ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(money.amountMinor / 100);
}
