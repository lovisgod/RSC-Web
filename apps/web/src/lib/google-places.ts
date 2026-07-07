import type { DeliveryAddressSuggestion } from "@rsc/contracts";

import { apiClient } from "@/src/lib/api";
import type { GeocodingResult } from "@/src/lib/geocoding";

export type GooglePlaceSuggestion = DeliveryAddressSuggestion;

export function isGooglePlacesConfigured(): boolean {
  return true;
}

export function createGooglePlacesSessionToken(): string {
  return crypto.randomUUID();
}

export function searchGoogleAddressSuggestions(
  input: string,
  sessionToken: string,
): Promise<GooglePlaceSuggestion[]> {
  return apiClient.searchDeliveryAddressSuggestions(input, sessionToken);
}

export async function resolveGoogleAddressSuggestion(
  suggestion: GooglePlaceSuggestion,
): Promise<GeocodingResult | null> {
  const result = await apiClient.resolveDeliveryAddress({
    suggestionId: suggestion.id,
    provider: suggestion.provider,
    sessionToken: suggestion.sessionToken ?? undefined,
  });

  return result;
}
