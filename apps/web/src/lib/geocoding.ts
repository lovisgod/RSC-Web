export interface GeocodingResult {
  addressLine: string; // the user's original typed text — most accurate
  city: string;
  state: string;
  label: string;
  displayName: string;
  latitude: number;
  longitude: number;
}

interface OpenCageComponents {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
}

interface OpenCageResult {
  geometry: { lat: number; lng: number };
  formatted: string;
  components: OpenCageComponents;
}

interface OpenCageResponse {
  total_results: number;
  results: OpenCageResult[];
}

function buildQuery(raw: string): string {
  const q = raw.trim();
  const lower = q.toLowerCase();
  // Avoid doubling up if the user already typed Lagos or Nigeria
  if (lower.includes("lagos") || lower.includes("nigeria")) return q;
  return `${q}, Lagos, Nigeria`;
}

async function fetchGeocode(query: string, originalText?: string): Promise<GeocodingResult | null> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
  if (!res.ok) return null;

  const data = (await res.json()) as OpenCageResponse;
  if (!data.total_results || !data.results.length) return null;

  const first = data.results[0];
  if (!first) return null;

  const c = first.components;

  // Use the caller's original text as addressLine (preserves house numbers OpenCage strips).
  // Fall back to formatted when called from reverse geocoding.
  const addressLine = (originalText ?? first.formatted.split(",")[0] ?? "").trim().slice(0, 80);

  // Components are sparse for Nigerian addresses — fall back to parsing formatted.
  const formattedParts = first.formatted
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && !/^\d+$/.test(p) && p.toLowerCase() !== "nigeria");

  const cityFromComponents = (c.city ?? c.town ?? c.village ?? c.county ?? "").trim();
  const stateFromComponents = (c.state ?? "").trim();

  const city =
    cityFromComponents ||
    (formattedParts.length >= 2 ? (formattedParts[formattedParts.length - 2] ?? "") : "Lagos");

  const state =
    stateFromComponents ||
    (formattedParts.length >= 1
      ? (formattedParts[formattedParts.length - 1] ?? "")
      : "Lagos State");

  const label = (c.road ?? c.suburb ?? c.neighbourhood ?? addressLine).trim().slice(0, 30);

  return {
    addressLine,
    city,
    state,
    label,
    displayName: first.formatted,
    latitude: first.geometry.lat,
    longitude: first.geometry.lng,
  };
}

export async function geocodeAddress(query: string): Promise<GeocodingResult | null> {
  return fetchGeocode(buildQuery(query), query.trim());
}

export async function reverseGeocode(lat: number, lon: number): Promise<GeocodingResult | null> {
  // Pass coordinates directly — no Lagos append needed, location is unambiguous.
  return fetchGeocode(`${lat},${lon}`);
}
