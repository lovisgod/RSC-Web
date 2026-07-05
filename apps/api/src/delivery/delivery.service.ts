import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

import type { AuthenticatedUser } from "../auth/authenticated-user";
import { DeliveryAddress } from "./delivery-address.entity";
import type {
  CreateDeliveryAddressDto,
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

@Injectable()
export class DeliveryService {
  constructor(
    @InjectRepository(DeliveryAddress)
    private readonly addresses: Repository<DeliveryAddress>,
    private readonly dataSource: DataSource,
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
