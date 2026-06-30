import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "../auth/auth.module";
import { DeliveryAddress } from "./delivery-address.entity";
import { DeliveryController } from "./delivery.controller";
import { DeliveryService } from "./delivery.service";
import { GeofenceZone } from "./geofence-zone.entity";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([DeliveryAddress, GeofenceZone])],
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
