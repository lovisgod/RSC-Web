import type { Money } from "@rsc/contracts";

export function formatMoney(money: Money, locale = "en-NG") {
  const hasKobo = Math.abs(money.amountMinor % 100) > 0.001;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
    minimumFractionDigits: hasKobo ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(money.amountMinor / 100);
}
