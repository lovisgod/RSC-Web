import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

import type { AuthenticatedUser } from "../auth/authenticated-user";
import type { ApplicationConfig } from "../config/configuration";
import { DeliveryAddress } from "./delivery-address.entity";
import type {
  AddressSuggestionsQueryDto,
  CreateDeliveryAddressDto,
  ResolveAddressDto,
  UpdateDeliveryAddressDto,
  ValidateAddressDto,
} from "./dto/delivery-address.dto";
import type { CreateGeofenceZoneDto, UpdateGeofenceZoneDto } from "./dto/geofence-zone.dto";

export interface AddressValidationResult {
  deliverable: boolean;
  zone: { id: string; name: string } | null;
}

export interface GeofenceZoneResult {
  id: string;
  name: string;
  polygon: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryAddressSuggestion {
  id: string;
  description: string;
  provider: "google" | "opencage";
  sessionToken: string | null;
}

export interface ResolvedDeliveryAddress {
  addressLine: string;
  city: string;
  state: string;
  label: string;
  displayName: string;
  latitude: number;
  longitude: number;
  provider: "google" | "opencage";
}

@Injectable()
export class DeliveryService {
  constructor(
    @InjectRepository(DeliveryAddress)
    private readonly addresses: Repository<DeliveryAddress>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService<ApplicationConfig, true>,
  ) {}

  listAddresses(user: AuthenticatedUser): Promise<DeliveryAddress[]> {
    return this.addresses.find({
      where: { customerId: user.id },
      order: { isDefault: "DESC", createdAt: "DESC" },
    });
  }

  async createAddress(
    user: AuthenticatedUser,
    input: CreateDeliveryAddressDto,
  ): Promise<DeliveryAddress> {
    const validation = await this.validateAddress(input);

    if (!validation.deliverable) {
      throw new BadRequestException("Delivery address is outside the service zone");
    }

    return this.dataSource.transaction(async (manager) => {
      if (input.isDefault) {
        await manager.update(
          DeliveryAddress,
          { customerId: user.id, isDefault: true },
          { isDefault: false },
        );
      }

      const count = await manager.count(DeliveryAddress, { where: { customerId: user.id } });
      const address = manager.create(DeliveryAddress, {
        customerId: user.id,
        label: input.label,
        addressLine: input.addressLine,
        city: input.city ?? null,
        state: input.state ?? null,
        latitude: input.latitude,
        longitude: input.longitude,
        isDefault: input.isDefault ?? count === 0,
      });

      return manager.save(address);
    });
  }

  async getAddress(user: AuthenticatedUser, id: string): Promise<DeliveryAddress> {
    const address = await this.addresses.findOneBy({ id, customerId: user.id });

    if (!address) {
      throw new NotFoundException("Delivery address not found");
    }

    return address;
  }

  async updateAddress(
    user: AuthenticatedUser,
    id: string,
    input: UpdateDeliveryAddressDto,
  ): Promise<DeliveryAddress> {
    const existing = await this.getAddress(user, id);

    if (input.latitude !== undefined || input.longitude !== undefined) {
      const validation = await this.validateAddress({
        latitude: input.latitude ?? existing.latitude,
        longitude: input.longitude ?? existing.longitude,
      });

      if (!validation.deliverable) {
        throw new BadRequestException("Delivery address is outside the service zone");
      }
    }

    return this.dataSource.transaction(async (manager) => {
      if (input.isDefault) {
        await manager.update(
          DeliveryAddress,
          { customerId: user.id, isDefault: true },
          { isDefault: false },
        );
      }

      Object.assign(existing, {
        ...input,
        city: input.city === undefined ? existing.city : input.city,
        state: input.state === undefined ? existing.state : input.state,
      });

      return manager.save(existing);
    });
  }

  async setDefaultAddress(user: AuthenticatedUser, id: string): Promise<DeliveryAddress> {
    const address = await this.getAddress(user, id);

    return this.dataSource.transaction(async (manager) => {
      await manager.update(
        DeliveryAddress,
        { customerId: user.id, isDefault: true },
        { isDefault: false },
      );
      address.isDefault = true;

      return manager.save(address);
    });
  }

  async deleteAddress(user: AuthenticatedUser, id: string): Promise<{ deleted: true }> {
    const address = await this.getAddress(user, id);
    await this.addresses.softRemove(address);

    return { deleted: true };
  }

  async validateAddress(input: ValidateAddressDto): Promise<AddressValidationResult> {
    const rows = await this.dataSource.query<{ id: string; name: string }[]>(
      `
        SELECT id, name
        FROM geofence_zones
        WHERE is_active = true
          AND ST_Contains(polygon, ST_SetSRID(ST_MakePoint($1, $2), 4326))
        ORDER BY name ASC
        LIMIT 1
      `,
      [input.longitude, input.latitude],
    );
    const zone = rows[0] ?? null;

    return { deliverable: Boolean(zone), zone };
  }

  async searchAddressSuggestions(
    query: AddressSuggestionsQueryDto,
  ): Promise<DeliveryAddressSuggestion[]> {
    const config = this.config.get("addressAutocomplete", { infer: true });
    const providers =
      config.provider === "google" ? ["google", "opencage"] : ["opencage", "google"];

    for (const provider of providers) {
      const suggestions =
        provider === "google"
          ? await this.searchGoogleSuggestions(query.q, query.sessionToken ?? null)
          : await this.searchOpenCageSuggestions(query.q, query.sessionToken ?? null);

      if (suggestions.length > 0) {
        return suggestions;
      }
    }

    return [];
  }

  async resolveAddress(input: ResolveAddressDto): Promise<ResolvedDeliveryAddress | null> {
    if (!input.suggestionId && !input.input) {
      throw new BadRequestException("Address input or suggestionId is required");
    }

    const preferredProvider =
      input.provider ?? this.config.get("addressAutocomplete", { infer: true }).provider;
    const providers =
      preferredProvider === "google"
        ? (["google", "opencage"] as const)
        : (["opencage", "google"] as const);

    for (const provider of providers) {
      const resolved =
        provider === "google"
          ? await this.resolveGoogleAddress(input)
          : await this.resolveOpenCageAddress(input);

      if (resolved) {
        return resolved;
      }
    }

    return null;
  }

  async listGeofenceZones(): Promise<GeofenceZoneResult[]> {
    return this.queryGeofenceZones(`WHERE is_active = true ORDER BY name ASC`);
  }

  async getGeofenceZone(id: string): Promise<GeofenceZoneResult> {
    const zones = await this.queryGeofenceZones(`WHERE id = $1 LIMIT 1`, [id]);
    const zone = zones[0];

    if (!zone) {
      throw new NotFoundException("Geofence zone not found");
    }

    return zone;
  }

  async createGeofenceZone(input: CreateGeofenceZoneDto): Promise<GeofenceZoneResult> {
    const [zone] = await this.dataSource.query<GeofenceZoneResult[]>(
      `
        INSERT INTO geofence_zones (name, polygon, is_active, updated_at)
        VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), $3, now())
        RETURNING
          id,
          name,
          ST_AsGeoJSON(polygon)::json AS polygon,
          is_active AS "isActive",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        input.name,
        JSON.stringify({ type: "Polygon", coordinates: input.coordinates }),
        input.isActive ?? true,
      ],
    );

    return normalizeGeofenceZone(zone!);
  }

  async updateGeofenceZone(id: string, input: UpdateGeofenceZoneDto): Promise<GeofenceZoneResult> {
    const existing = await this.getGeofenceZone(id);
    const [zone] = await this.dataSource.query<GeofenceZoneResult[]>(
      `
        UPDATE geofence_zones
        SET
          name = $2,
          polygon = CASE
            WHEN $3::text IS NULL THEN polygon
            ELSE ST_SetSRID(ST_GeomFromGeoJSON($3), 4326)
          END,
          is_active = $4,
          updated_at = now()
        WHERE id = $1
        RETURNING
          id,
          name,
          ST_AsGeoJSON(polygon)::json AS polygon,
          is_active AS "isActive",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        id,
        input.name ?? existing.name,
        input.coordinates
          ? JSON.stringify({ type: "Polygon", coordinates: input.coordinates })
          : null,
        input.isActive ?? existing.isActive,
      ],
    );

    return normalizeGeofenceZone(zone!);
  }

  async deleteGeofenceZone(id: string): Promise<{ deleted: true }> {
    await this.getGeofenceZone(id);
    await this.dataSource.query(
      `UPDATE geofence_zones SET is_active = false, updated_at = now() WHERE id = $1`,
      [id],
    );

    return { deleted: true };
  }

  private async searchGoogleSuggestions(
    input: string,
    sessionToken: string | null,
  ): Promise<DeliveryAddressSuggestion[]> {
    const { google } = this.config.get("addressAutocomplete", { infer: true });

    if (!google.apiKey) {
      return [];
    }

    try {
      const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": google.apiKey,
          "X-Goog-FieldMask":
            "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
        },
        body: JSON.stringify({
          input: normalizeLagosQuery(input),
          includedRegionCodes: ["ng"],
          regionCode: "ng",
          languageCode: "en",
          ...(sessionToken ? { sessionToken } : {}),
          locationRestriction: {
            rectangle: {
              low: { latitude: 6.35, longitude: 3.25 },
              high: { latitude: 6.65, longitude: 3.75 },
            },
          },
        }),
      });

      if (!response.ok) {
        return [];
      }

      const data = (await response.json()) as GoogleAutocompleteResponse;

      return (data.suggestions ?? [])
        .map((suggestion) => suggestion.placePrediction)
        .filter((prediction): prediction is GooglePlacePrediction => Boolean(prediction?.placeId))
        .map((prediction) => ({
          id: prediction.placeId,
          description: prediction.text?.text ?? prediction.placeId,
          provider: "google" as const,
          sessionToken,
        }));
    } catch {
      return [];
    }
  }

  private async resolveGoogleAddress(
    input: ResolveAddressDto,
  ): Promise<ResolvedDeliveryAddress | null> {
    const { google } = this.config.get("addressAutocomplete", { infer: true });
    const placeId = input.provider === "google" ? input.suggestionId : input.suggestionId;

    if (!google.apiKey || !placeId) {
      return null;
    }

    try {
      const response = await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": google.apiKey,
            "X-Goog-FieldMask": "id,displayName,formattedAddress,location,addressComponents",
          },
        },
      );

      if (!response.ok) {
        return null;
      }

      const place = (await response.json()) as GooglePlaceDetailsResponse;

      if (!place.location) {
        return null;
      }

      const addressLine = (place.formattedAddress ?? input.input ?? "").trim();
      const city =
        findGoogleAddressComponent(place.addressComponents ?? [], [
          "locality",
          "administrative_area_level_2",
        ]) ?? "Lagos";
      const state =
        findGoogleAddressComponent(place.addressComponents ?? [], [
          "administrative_area_level_1",
        ]) ?? "Lagos State";
      const label =
        findGoogleAddressComponent(place.addressComponents ?? [], [
          "route",
          "neighborhood",
          "sublocality",
        ]) ??
        place.displayName?.text ??
        addressLine;

      return {
        addressLine,
        city,
        state,
        label: label.slice(0, 30),
        displayName: place.formattedAddress ?? addressLine,
        latitude: place.location.latitude,
        longitude: place.location.longitude,
        provider: "google",
      };
    } catch {
      return null;
    }
  }

  private async searchOpenCageSuggestions(
    input: string,
    sessionToken: string | null,
  ): Promise<DeliveryAddressSuggestion[]> {
    const response = await this.fetchOpenCage(input, 5);

    return (response?.results ?? []).map((result, index) => ({
      id: encodeOpenCageSuggestionId(result.formatted, index),
      description: result.formatted,
      provider: "opencage" as const,
      sessionToken,
    }));
  }

  private async resolveOpenCageAddress(
    input: ResolveAddressDto,
  ): Promise<ResolvedDeliveryAddress | null> {
    const query = input.input ?? decodeOpenCageSuggestionId(input.suggestionId ?? "");
    const response = await this.fetchOpenCage(query, 1);
    const first = response?.results?.[0];

    return first ? normalizeOpenCageResult(first, input.input ?? query) : null;
  }

  private async fetchOpenCage(input: string, limit: number): Promise<OpenCageResponse | null> {
    const { opencage } = this.config.get("addressAutocomplete", { infer: true });

    if (!opencage.apiKey || !input.trim()) {
      return null;
    }

    try {
      const url = new URL(opencage.baseUrl);
      url.searchParams.set("q", normalizeLagosQuery(input));
      url.searchParams.set("key", opencage.apiKey);
      url.searchParams.set("countrycode", "ng");
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("no_annotations", "1");
      url.searchParams.set("language", "en");

      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as OpenCageResponse;
    } catch {
      return null;
    }
  }

  private async queryGeofenceZones(
    whereClause: string,
    params: unknown[] = [],
  ): Promise<GeofenceZoneResult[]> {
    const rows = await this.dataSource.query<
      Array<{
        id: string;
        name: string;
        polygon: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
      }>
    >(
      `
        SELECT
          id,
          name,
          ST_AsGeoJSON(polygon)::json AS polygon,
          is_active AS "isActive",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM geofence_zones
        ${whereClause}
      `,
      params,
    );

    return rows.map(normalizeGeofenceZone);
  }
}

function normalizeGeofenceZone(zone: GeofenceZoneResult): GeofenceZoneResult {
  const polygon: unknown =
    typeof zone.polygon === "string" ? parseGeoJson(zone.polygon) : zone.polygon;

  return { ...zone, polygon };
}

function parseGeoJson(value: string): unknown {
  return JSON.parse(value) as unknown;
}

interface GoogleAutocompleteResponse {
  suggestions?: Array<{
    placePrediction?: GooglePlacePrediction;
  }>;
}

interface GooglePlacePrediction {
  placeId: string;
  text?: { text?: string };
}

interface GoogleAddressComponent {
  longText?: string;
  shortText?: string;
  types?: string[];
}

interface GooglePlaceDetailsResponse {
  formattedAddress?: string;
  displayName?: { text?: string };
  location?: { latitude: number; longitude: number };
  addressComponents?: GoogleAddressComponent[];
}

interface OpenCageComponents {
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
  results?: OpenCageResult[];
}

function normalizeLagosQuery(raw: string): string {
  const query = raw.trim();
  const lower = query.toLowerCase();

  if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(query)) {
    return query;
  }

  return lower.includes("lagos") || lower.includes("nigeria") ? query : `${query}, Lagos, Nigeria`;
}

function findGoogleAddressComponent(
  components: GoogleAddressComponent[],
  types: string[],
): string | null {
  const component = components.find((entry) => types.some((type) => entry.types?.includes(type)));

  return component?.longText ?? component?.shortText ?? null;
}

function normalizeOpenCageResult(
  result: OpenCageResult,
  originalText: string,
): ResolvedDeliveryAddress {
  const components = result.components;
  const formattedParts = result.formatted
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && !/^\d+$/.test(part) && part.toLowerCase() !== "nigeria");
  const addressLine = (originalText || result.formatted.split(",")[0] || "").trim().slice(0, 80);
  const city =
    components.city ??
    components.town ??
    components.village ??
    components.county ??
    (formattedParts.length >= 2 ? formattedParts[formattedParts.length - 2] : null) ??
    "Lagos";
  const state =
    components.state ??
    (formattedParts.length >= 1 ? formattedParts[formattedParts.length - 1] : null) ??
    "Lagos State";
  const label = (components.road ?? components.suburb ?? components.neighbourhood ?? addressLine)
    .trim()
    .slice(0, 30);

  return {
    addressLine,
    city,
    state,
    label,
    displayName: result.formatted,
    latitude: result.geometry.lat,
    longitude: result.geometry.lng,
    provider: "opencage",
  };
}

function encodeOpenCageSuggestionId(formatted: string, index: number): string {
  return Buffer.from(`${index}:${formatted}`, "utf8").toString("base64url");
}

function decodeOpenCageSuggestionId(value: string): string {
  if (!value) {
    return "";
  }

  const decoded = Buffer.from(value, "base64url").toString("utf8");
  const separator = decoded.indexOf(":");

  return separator === -1 ? decoded : decoded.slice(separator + 1);
}
