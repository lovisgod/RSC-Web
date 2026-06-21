import type { Money } from "@rsc/contracts";

export function formatMoney(money: Money, locale = "en-NG") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
  }).format(money.amountMinor / 100);
}
