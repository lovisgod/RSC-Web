import type { GeocodingResult } from "@/src/lib/geocoding";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_SCRIPT_ID = "google-maps-js";
const LAGOS_DELIVERY_BOUNDS = {
  west: 3.25,
  south: 6.35,
  east: 3.75,
  north: 6.65,
};

let scriptPromise: Promise<void> | null = null;
let placesLibraryPromise: Promise<PlacesLibrary | null> | null = null;

interface GoogleMapsWindow extends Window {
  google?: {
    maps?: {
      importLibrary?: (library: "places") => Promise<unknown>;
    };
  };
}

interface AutocompleteSessionTokenConstructor {
  new (): unknown;
}

interface AutocompleteSuggestionConstructor {
  fetchAutocompleteSuggestions(
    request: Record<string, unknown>,
  ): Promise<{ suggestions: GoogleAutocompleteSuggestion[] }>;
}

interface PlacesLibrary {
  AutocompleteSessionToken: AutocompleteSessionTokenConstructor;
  AutocompleteSuggestion: AutocompleteSuggestionConstructor;
}

interface GoogleLatLng {
  lat(): number;
  lng(): number;
}

interface GoogleAddressComponent {
  longText?: string;
  shortText?: string;
  types?: string[];
}

interface GooglePlace {
  id?: string;
  displayName?: string;
  formattedAddress?: string;
  location?: GoogleLatLng;
  addressComponents?: GoogleAddressComponent[];
  fetchFields(input: { fields: string[] }): Promise<void>;
}

interface GooglePlacePrediction {
  placeId?: string;
  text: { toString(): string };
  toPlace(): GooglePlace;
}

interface GoogleAutocompleteSuggestion {
  placePrediction?: GooglePlacePrediction;
}

export interface GooglePlaceSuggestion {
  id: string;
  description: string;
  prediction: GooglePlacePrediction;
}

export function isGooglePlacesConfigured(): boolean {
  return Boolean(GOOGLE_MAPS_API_KEY);
}

export async function createGooglePlacesSessionToken(): Promise<unknown | null> {
  const places = await loadPlacesLibrary();

  return places ? new places.AutocompleteSessionToken() : null;
}

export async function searchGoogleAddressSuggestions(
  input: string,
  sessionToken: unknown,
): Promise<GooglePlaceSuggestion[]> {
  const places = await loadPlacesLibrary();

  if (!places || input.trim().length < 3) {
    return [];
  }

  const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input: input.trim(),
    sessionToken,
    includedRegionCodes: ["ng"],
    language: "en",
    region: "ng",
    locationRestriction: LAGOS_DELIVERY_BOUNDS,
  });

  return suggestions
    .map((suggestion) => suggestion.placePrediction)
    .filter((prediction): prediction is GooglePlacePrediction => Boolean(prediction))
    .map((prediction) => ({
      id: prediction.placeId ?? prediction.text.toString(),
      description: prediction.text.toString(),
      prediction,
    }));
}

export async function resolveGoogleAddressSuggestion(
  suggestion: GooglePlaceSuggestion,
): Promise<GeocodingResult | null> {
  const place = suggestion.prediction.toPlace();

  await place.fetchFields({
    fields: ["id", "displayName", "formattedAddress", "location", "addressComponents"],
  });

  if (!place.location) {
    return null;
  }

  const addressLine = (place.formattedAddress ?? suggestion.description).trim();
  const components = place.addressComponents ?? [];
  const city =
    findAddressComponent(components, ["locality", "administrative_area_level_2"]) ?? "Lagos";
  const state = findAddressComponent(components, ["administrative_area_level_1"]) ?? "Lagos State";
  const label =
    findAddressComponent(components, ["route", "neighborhood", "sublocality"]) ??
    place.displayName ??
    addressLine;

  return {
    addressLine,
    city,
    state,
    label: label.slice(0, 30),
    displayName: place.formattedAddress ?? suggestion.description,
    latitude: place.location.lat(),
    longitude: place.location.lng(),
  };
}

async function loadPlacesLibrary(): Promise<PlacesLibrary | null> {
  if (!GOOGLE_MAPS_API_KEY || typeof window === "undefined") {
    return null;
  }

  if (!placesLibraryPromise) {
    placesLibraryPromise = loadGoogleMapsScript().then(async () => {
      const googleMaps = (window as GoogleMapsWindow).google?.maps;

      if (!googleMaps?.importLibrary) {
        throw new Error("Google Maps JavaScript API did not load correctly");
      }

      return (await googleMaps.importLibrary("places")) as PlacesLibrary;
    });
  }

  return placesLibraryPromise;
}

function loadGoogleMapsScript(): Promise<void> {
  if ((window as GoogleMapsWindow).google?.maps?.importLibrary) {
    return Promise.resolve();
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google Maps failed to load")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      GOOGLE_MAPS_API_KEY!,
    )}&v=weekly&libraries=places&loading=async`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

function findAddressComponent(
  components: GoogleAddressComponent[],
  types: string[],
): string | null {
  const component = components.find((entry) => types.some((type) => entry.types?.includes(type)));

  return component?.longText ?? component?.shortText ?? null;
}
