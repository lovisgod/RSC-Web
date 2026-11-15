import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, type Repository } from "typeorm";

import { UserRole } from "../auth/user-role.enum";
import type { ApplicationConfig } from "../config/configuration";
import { NotificationsService } from "../notifications/notifications.service";
import { RealtimeService } from "../realtime/realtime.service";
import { RouteEstimationService } from "./route-estimation.service";
import { RiderTrackingIncident } from "./rider-tracking-incident.entity";

interface NavTokenResponse {
  access_token?: string;
  expires_in?: number;
}

interface NavDevice {
  DeviceName?: string;
  Lat?: string | number;
  Lon?: string | number;
  GPSDateTime?: string;
  Heading?: number;
  VehicleSpeed?: number;
}

interface NavCurrentDataResponse {
  Data?: NavDevice[];
}

interface RiderRow {
  id: string;
  plateNumber: string | null;
}

interface ActiveOrderRow {
  id: string;
  latitude: number | null;
  longitude: number | null;
}

interface ActiveDeliveryTrackingRow {
  orderId: string;
  riderId: string;
  riderName: string;
  plateNumber: string | null;
  outletIds: string[];
  lastSeenAt: Date | null;
  trackingStartedAt: Date;
}

@Injectable()
export class RiderTrackingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RiderTrackingService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private syncPromise: Promise<void> | null = null;
  private token: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService<ApplicationConfig, true>,
    private readonly realtime: RealtimeService,
    private readonly routes: RouteEstimationService,
    private readonly notifications: NotificationsService,
    @InjectRepository(RiderTrackingIncident)
    private readonly incidents: Repository<RiderTrackingIncident>,
  ) {}

  onModuleInit(): void {
    const tracking = this.config.get("riderTracking", { infer: true });
    if (tracking.provider !== "nav_naija") return;

    this.timer = setInterval(() => void this.sync(), tracking.pollIntervalMs);
    void this.sync();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async sync(): Promise<void> {
    if (this.syncPromise) return this.syncPromise;
    this.syncPromise = this.syncDevices()
      .catch((error: unknown) => {
        this.logger.error(
          `NavNija rider sync failed: ${error instanceof Error ? error.message : "unknown error"}`,
        );
      })
      .finally(() => {
        this.syncPromise = null;
      });
    return this.syncPromise;
  }

  private async syncDevices(): Promise<void> {
    const devices = await this.fetchCurrentData();

    const riders = await this.dataSource.query<RiderRow[]>(
      `SELECT id, plate_number AS "plateNumber" FROM users WHERE role = $1 AND deleted_at IS NULL`,
      [UserRole.RIDER],
    );
    const ridersByPlate = new Map(
      riders
        .filter((rider) => rider.plateNumber)
        .map((rider) => [normalizeAssetName(rider.plateNumber!), rider]),
    );

    for (const device of devices) {
      const rider = device.DeviceName
        ? ridersByPlate.get(normalizeAssetName(device.DeviceName))
        : null;
      if (!rider) continue;

      const latitude = Number(device.Lat);
      const longitude = Number(device.Lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

      const [order] = await this.dataSource.query<ActiveOrderRow[]>(
        `
          SELECT id, delivery_latitude AS "latitude", delivery_longitude AS "longitude"
          FROM master_orders
          WHERE rider_id = $1 AND delivery_mode = 'DELIVERY' AND status = 'OUT_FOR_DELIVERY' AND deleted_at IS NULL
          ORDER BY updated_at DESC
          LIMIT 1
        `,
        [rider.id],
      );
      const estimate =
        order?.latitude !== null &&
        order?.latitude !== undefined &&
        order?.longitude !== null &&
        order?.longitude !== undefined
          ? await this.routes.estimate(
              { latitude, longitude },
              { latitude: Number(order.latitude), longitude: Number(order.longitude) },
            )
          : null;
      const recordedAt = parseTrackerDate(device.GPSDateTime);
      const masterOrderId = order?.id ?? null;

      const rows = await this.dataSource.query<Array<{ recordedAt: Date }>>(
        `
          SELECT recorded_at AS "recordedAt"
          FROM rider_locations
          WHERE rider_id = $1
          ORDER BY recorded_at DESC
          LIMIT 1
        `,
        [rider.id],
      );
      if (rows[0]?.recordedAt && rows[0].recordedAt >= recordedAt) continue;

      await this.dataSource.query(
        `
          INSERT INTO rider_locations (
            rider_id, master_order_id, geom, recorded_at, eta_minutes, distance_km, eta_provider
          ) VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6, $7, $8)
        `,
        [
          rider.id,
          masterOrderId,
          longitude,
          latitude,
          recordedAt,
          estimate ? Math.max(0, Math.ceil(estimate.durationSeconds / 60)) : null,
          estimate?.distanceKm ?? null,
          estimate?.provider ?? null,
        ],
      );

      this.realtime.emitRiderLocationUpdate({
        riderId: rider.id,
        masterOrderId,
        latitude,
        longitude,
        recordedAt,
        etaMinutes: estimate ? Math.max(0, Math.ceil(estimate.durationSeconds / 60)) : null,
        distanceKm: estimate?.distanceKm ?? null,
        etaProvider: estimate?.provider ?? null,
      });
    }

    await this.updateTrackingIncidents();
  }

  private async updateTrackingIncidents(): Promise<void> {
    const tracking = this.config.get("riderTracking", { infer: true });
    const deliveries = await this.dataSource.query<ActiveDeliveryTrackingRow[]>(
      `
        SELECT
          mo.id AS "orderId",
          mo.rider_id AS "riderId",
          rider.name AS "riderName",
          rider.plate_number AS "plateNumber",
          COALESCE(
            ARRAY_AGG(DISTINCT so.outlet_id) FILTER (WHERE so.outlet_id IS NOT NULL),
            ARRAY[]::uuid[]
          ) AS "outletIds",
          latest.recorded_at AS "lastSeenAt",
          mo.updated_at AS "trackingStartedAt"
        FROM master_orders mo
        INNER JOIN users rider ON rider.id = mo.rider_id AND rider.deleted_at IS NULL
        LEFT JOIN sub_orders so ON so.master_order_id = mo.id AND so.deleted_at IS NULL
        LEFT JOIN LATERAL (
          SELECT recorded_at
          FROM rider_locations
          WHERE rider_id = mo.rider_id AND master_order_id = mo.id
          ORDER BY recorded_at DESC
          LIMIT 1
        ) latest ON TRUE
        WHERE mo.rider_id IS NOT NULL
          AND mo.delivery_mode = 'DELIVERY'
          AND mo.status = 'OUT_FOR_DELIVERY'
          AND mo.deleted_at IS NULL
        GROUP BY mo.id, mo.rider_id, rider.name, rider.plate_number, latest.recorded_at, mo.updated_at
      `,
    );

    const now = Date.now();
    for (const delivery of deliveries) {
      const observedAt = delivery.lastSeenAt?.getTime() ?? delivery.trackingStartedAt.getTime();
      const ageMs = Math.max(0, now - observedAt);
      const incident = await this.incidents.findOne({
        where: { masterOrderId: delivery.orderId },
      });

      if (ageMs < tracking.staleAfterMs) {
        if (incident && incident.status !== "RESOLVED") {
          incident.status = "RESOLVED";
          incident.resolvedAt = new Date(now);
          incident.lastSeenAt = delivery.lastSeenAt;
          await this.incidents.save(incident);
          if (incident.status === "RESOLVED") {
            await this.notifyTrackingRecovered(delivery);
          }
        }
        continue;
      }

      if (!incident) {
        const created = this.incidents.create({
          masterOrderId: delivery.orderId,
          riderId: delivery.riderId,
          status: ageMs >= tracking.offlineAfterMs ? "OFFLINE" : "STALE",
          lastSeenAt: delivery.lastSeenAt,
          staleAt: new Date(now),
          offlineAt: ageMs >= tracking.offlineAfterMs ? new Date(now) : null,
          resolvedAt: null,
        });
        await this.incidents.save(created);
        if (created.status === "OFFLINE") await this.notifyTrackingOffline(delivery, created);
        continue;
      }

      if (ageMs >= tracking.offlineAfterMs && incident.status !== "OFFLINE") {
        incident.status = "OFFLINE";
        incident.offlineAt = new Date(now);
        incident.lastSeenAt = delivery.lastSeenAt;
        await this.incidents.save(incident);
        await this.notifyTrackingOffline(delivery, incident);
      } else if (ageMs < tracking.offlineAfterMs && incident.status === "RESOLVED") {
        incident.status = "STALE";
        incident.staleAt = new Date(now);
        incident.resolvedAt = null;
        incident.lastSeenAt = delivery.lastSeenAt;
        await this.incidents.save(incident);
      }
    }
  }

  private async notifyTrackingOffline(
    delivery: ActiveDeliveryTrackingRow,
    incident: RiderTrackingIncident,
  ): Promise<void> {
    const admins = await this.dataSource.query<Array<{ id: string }>>(
      `
        SELECT id
        FROM users
        WHERE role = $1
          AND outlet_id = ANY($2::uuid[])
          AND deleted_at IS NULL
      `,
      [UserRole.ADMIN, delivery.outletIds],
    );
    const lastSeen = delivery.lastSeenAt
      ? delivery.lastSeenAt.toISOString()
      : "No GPS location received for this delivery";
    const data = {
      masterOrderId: delivery.orderId,
      riderId: delivery.riderId,
      plateNumber: delivery.plateNumber,
      status: "OFFLINE",
      lastSeenAt: delivery.lastSeenAt?.toISOString() ?? null,
      deepLink: `rsc://admin/orders/${delivery.orderId}`,
    };

    await Promise.all(
      admins.map(async (admin) => {
        const notification = await this.notifications.createAndPush({
          recipientId: admin.id,
          recipientRole: UserRole.ADMIN,
          type: "RIDER_TRACKING_OFFLINE",
          title: "GPS tracking unavailable",
          body: `Tracking is unavailable for rider ${delivery.plateNumber ?? delivery.riderName} on order ${delivery.orderId}. Last update: ${lastSeen}.`,
          data,
        });
        this.realtime.emitAdminNotification(
          {
            id: notification.id,
            recipientId: admin.id,
            recipientRole: UserRole.ADMIN,
            type: "RIDER_TRACKING_OFFLINE",
            title: notification.title,
            body: notification.body,
            data,
            createdAt: notification.createdAt,
          },
          delivery.outletIds,
        );
      }),
    );

    this.logger.warn(
      `Rider tracking offline: order=${delivery.orderId} rider=${delivery.riderId} incident=${incident.id}`,
    );
  }

  private async notifyTrackingRecovered(delivery: ActiveDeliveryTrackingRow): Promise<void> {
    const admins = await this.dataSource.query<Array<{ id: string }>>(
      `
        SELECT id
        FROM users
        WHERE role = $1
          AND outlet_id = ANY($2::uuid[])
          AND deleted_at IS NULL
      `,
      [UserRole.ADMIN, delivery.outletIds],
    );
    const data = {
      masterOrderId: delivery.orderId,
      riderId: delivery.riderId,
      plateNumber: delivery.plateNumber,
      status: "RESOLVED",
      lastSeenAt: delivery.lastSeenAt?.toISOString() ?? null,
      deepLink: `rsc://admin/orders/${delivery.orderId}`,
    };

    await Promise.all(
      admins.map(async (admin) => {
        const notification = await this.notifications.createAndPush({
          recipientId: admin.id,
          recipientRole: UserRole.ADMIN,
          type: "RIDER_TRACKING_RECOVERED",
          title: "GPS tracking restored",
          body: `Tracking has resumed for rider ${delivery.plateNumber ?? delivery.riderName} on order ${delivery.orderId}.`,
          data,
        });
        this.realtime.emitAdminNotification(
          {
            id: notification.id,
            recipientId: admin.id,
            recipientRole: UserRole.ADMIN,
            type: "RIDER_TRACKING_RECOVERED",
            title: notification.title,
            body: notification.body,
            data,
            createdAt: notification.createdAt,
          },
          delivery.outletIds,
        );
      }),
    );
  }

  private async fetchCurrentData(): Promise<NavDevice[]> {
    const tracking = this.config.get("riderTracking", { infer: true }).navNaija;
    if (!tracking.apiKey || !tracking.secretKey) {
      this.logger.warn("NavNija tracking is enabled but API credentials are missing");
      return [];
    }
    if (!tracking.clientId && tracking.imeiNos.length === 0) {
      this.logger.warn("NavNija tracking requires NAV_NAIJA_CLIENT_ID or NAV_NAIJA_IMEI_NOS");
      return [];
    }

    const token = await this.getToken();
    const body: { ClientID?: string; imei_nos?: number[] } = {};
    if (tracking.clientId) body.ClientID = tracking.clientId;
    if (tracking.imeiNos.length > 0) body.imei_nos = tracking.imeiNos;

    const response = await fetch(`${tracking.baseUrl}/api/Asset/GetDevicesCurrentData`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`current-data request returned ${response.status}`);
    return ((await response.json()) as NavCurrentDataResponse).Data ?? [];
  }

  private async getToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    const tracking = this.config.get("riderTracking", { infer: true }).navNaija;
    const response = await fetch(`${tracking.baseUrl}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        username: tracking.apiKey,
        password: tracking.secretKey,
        grant_type: "password",
      }),
    });
    if (!response.ok) throw new Error(`token request returned ${response.status}`);
    const payload = (await response.json()) as NavTokenResponse;
    if (!payload.access_token)
      throw new Error("NavNija token response did not include access_token");
    this.token = {
      value: payload.access_token,
      expiresAt: Date.now() + (payload.expires_in ?? 7200) * 1000,
    };
    return payload.access_token;
  }
}

function normalizeAssetName(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replaceAll(/[^A-Z0-9]/g, "");
}

function parseTrackerDate(value: string | undefined): Date {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}
