import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

import type { AuthenticatedUser } from "../auth/authenticated-user";
import { UserRole } from "../auth/user-role.enum";
import type { RecordRiderLocationDto } from "./dto/rider-location.dto";
import { RiderLocation } from "./rider-location.entity";

@Injectable()
export class RidersService {
  constructor(
    @InjectRepository(RiderLocation)
    private readonly locations: Repository<RiderLocation>,
    private readonly dataSource: DataSource,
  ) {}

  async recordLocation(
    user: AuthenticatedUser,
    input: RecordRiderLocationDto,
  ): Promise<RiderLocation> {
    if (user.role !== UserRole.RIDER) {
      throw new ForbiddenException("Only riders can record rider locations");
    }

    const rows = await this.dataSource.query<RiderLocation[]>(
      `
        INSERT INTO rider_locations (rider_id, master_order_id, geom)
        VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326))
        RETURNING id, rider_id AS "riderId", master_order_id AS "masterOrderId", ST_AsText(geom) AS geom, recorded_at AS "recordedAt"
      `,
      [user.id, input.masterOrderId ?? null, input.longitude, input.latitude],
    );

    return rows[0]!;
  }

  listMine(user: AuthenticatedUser): Promise<RiderLocation[]> {
    if (user.role !== UserRole.RIDER) {
      throw new ForbiddenException("Only riders can view rider locations");
    }

    return this.locations.find({
      where: { riderId: user.id },
      order: { recordedAt: "DESC" },
      take: 100,
    });
  }
}
