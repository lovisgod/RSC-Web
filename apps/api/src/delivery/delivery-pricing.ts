export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface CalculateOutletDeliveryFeeParams {
  pricingModel?: "FLAT" | "PER_KM" | "PER_LOCATION" | null | undefined;
  flatFeeMinor?: number | null | undefined;
  baseFeeMinor?: number | null | undefined;
  pricePerKmMinor?: number | null | undefined;
  locationFees?:
    | Array<{ locationName: string; zoneId?: string | null | undefined; feeMinor: number }>
    | null
    | undefined;
  outletLatitude?: number | null | undefined;
  outletLongitude?: number | null | undefined;
  deliveryLatitude?: number | null | undefined;
  deliveryLongitude?: number | null | undefined;
  zoneId?: string | null | undefined;
  zoneName?: string | null | undefined;
  fallbackFeeMinor?: number | undefined;
}

export function calculateOutletDeliveryFee(params: CalculateOutletDeliveryFeeParams): number {
  const model = params.pricingModel ?? "FLAT";
  const fallback = params.fallbackFeeMinor ?? 150_000;

  if (model === "PER_KM") {
    const baseFee = params.baseFeeMinor ?? 0;
    const pricePerKm = params.pricePerKmMinor ?? 0;
    if (
      params.outletLatitude != null &&
      params.outletLongitude != null &&
      params.deliveryLatitude != null &&
      params.deliveryLongitude != null
    ) {
      const distanceKm = calculateDistanceKm(
        params.outletLatitude,
        params.outletLongitude,
        params.deliveryLatitude,
        params.deliveryLongitude,
      );
      return Math.max(0, baseFee + Math.round(distanceKm * pricePerKm));
    }
    return Math.max(0, baseFee || (params.flatFeeMinor ?? fallback));
  }

  if (model === "PER_LOCATION") {
    const baseFallback = params.baseFeeMinor ?? params.flatFeeMinor ?? fallback;
    const locationFees = params.locationFees ?? [];
    if (locationFees.length > 0) {
      if (params.zoneId) {
        const matchByZone = locationFees.find(
          (loc) => loc.zoneId && loc.zoneId.toLowerCase() === params.zoneId?.toLowerCase(),
        );
        if (matchByZone) return matchByZone.feeMinor;
      }
      if (params.zoneName) {
        const target = params.zoneName.trim().toLowerCase();
        const matchByName = locationFees.find(
          (loc) =>
            loc.locationName.trim().toLowerCase() === target ||
            target.includes(loc.locationName.trim().toLowerCase()) ||
            loc.locationName.trim().toLowerCase().includes(target),
        );
        if (matchByName) return matchByName.feeMinor;
      }
    }
    return baseFallback;
  }

  return params.flatFeeMinor ?? fallback;
}
