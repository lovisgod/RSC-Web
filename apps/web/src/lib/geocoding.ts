import { apiClient } from "@/src/lib/api";

export interface GeocodingResult {
  addressLine: string;
  city: string;
  state: string;
  label: string;
  displayName: string;
  latitude: number;
  longitude: number;
}

export function geocodeAddress(query: string): Promise<GeocodingResult | null> {
  return apiClient.resolveDeliveryAddress({ input: query });
}

export function reverseGeocode(lat: number, lon: number): Promise<GeocodingResult | null> {
  return apiClient.resolveDeliveryAddress({ input: `${lat},${lon}` });
}
