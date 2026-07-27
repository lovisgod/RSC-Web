interface DiscountPriceProps {
  priceMinor: number;
  currentPriceMinor?: number;
  isDiscountActive?: boolean;
  currency?: string;
  className?: string;
  showBadge?: boolean;
}

function formatPrice(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

export function DiscountPrice({
  priceMinor,
  currentPriceMinor = priceMinor,
  isDiscountActive = false,
  currency = "NGN",
  className = "",
  showBadge = false,
}: DiscountPriceProps) {
  const discounted = isDiscountActive && currentPriceMinor < priceMinor;
  const percentage = discounted
    ? Math.round(((priceMinor - currentPriceMinor) / priceMinor) * 100)
    : 0;

  return (
    <span className={`rsc-discount-price ${className}`.trim()}>
      {discounted && (
        <span className="rsc-discount-price__original">{formatPrice(priceMinor, currency)}</span>
      )}
      <span className="rsc-discount-price__current">
        {formatPrice(currentPriceMinor, currency)}
      </span>
      {discounted && showBadge && (
        <span className="rsc-discount-price__badge">{percentage}% off</span>
      )}
    </span>
  );
}
