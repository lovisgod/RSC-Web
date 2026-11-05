import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApplicationConfig } from "../config/configuration";

export interface RouteEstimate {
  distanceKm: number;
  durationSeconds: number;
  provider: "google" | "osrm";
}

interface GoogleDirectionsResponse {
  routes?: Array<{
    legs?: Array<{ distance?: { value?: number }; duration?: { value?: number } }>;
  }>;
}

interface OsrmRouteResponse {
  code?: string;
  routes?: Array<{ distance?: number; duration?: number }>;
}

@Injectable()
export class RouteEstimationService {
  private readonly logger = new Logger(RouteEstimationService.name);
  private readonly cache = new Map<string, { expiresAt: number; estimate: RouteEstimate | null }>();

  constructor(private readonly config: ConfigService<ApplicationConfig, true>) {}

  async estimate(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
  ): Promise<RouteEstimate | null> {
    const routing = this.config.get("routing", { infer: true });
    const key = [
      routing.provider,
      origin.latitude.toFixed(4),
      origin.longitude.toFixed(4),
      destination.latitude.toFixed(4),
      destination.longitude.toFixed(4),
    ].join(":");
    const cached = this.cache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.estimate;
    }

    const estimate =
      routing.provider === "google"
        ? await this.fetchGoogle(origin, destination)
        : await this.fetchOsrm(origin, destination);

    this.cache.set(key, { estimate, expiresAt: Date.now() + 15_000 });
    return estimate;
  }

  private async fetchGoogle(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
  ): Promise<RouteEstimate | null> {
    const { googleApiKey, timeoutMs } = this.config.get("routing", { infer: true });
    if (!googleApiKey) return null;

    const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
    url.searchParams.set("origin", `${origin.latitude},${origin.longitude}`);
    url.searchParams.set("destination", `${destination.latitude},${destination.longitude}`);
    url.searchParams.set("mode", "driving");
    url.searchParams.set("key", googleApiKey);

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) return null;
      const payload = (await response.json()) as GoogleDirectionsResponse;
      const leg = payload.routes?.[0]?.legs?.[0];
      if (!leg?.distance?.value || !leg.duration?.value) return null;

      return {
        distanceKm: leg.distance.value / 1000,
        durationSeconds: leg.duration.value,
        provider: "google",
      };
    } catch (error) {
      this.logger.warn(
        `Google route estimate failed: ${error instanceof Error ? error.message : "unknown error"}`,
      );
      return null;
    }
  }

  private async fetchOsrm(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
  ): Promise<RouteEstimate | null> {
    const { osrmBaseUrl, timeoutMs } = this.config.get("routing", { infer: true });
    const url = `${osrmBaseUrl}/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=false`;

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) return null;
      const payload = (await response.json()) as OsrmRouteResponse;
      const route = payload.routes?.[0];
      if (payload.code !== "Ok" || !route?.distance || !route.duration) return null;

      return {
        distanceKm: route.distance / 1000,
        durationSeconds: route.duration,
        provider: "osrm",
      };
    } catch (error) {
      this.logger.warn(
        `OSRM route estimate failed: ${error instanceof Error ? error.message : "unknown error"}`,
      );
      return null;
    }
  }
}
