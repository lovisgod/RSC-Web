import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { RealtimeModule } from "../realtime/realtime.module";
import { MasterOrder } from "../orders/master-order.entity";
import { RiderLocation } from "../riders/rider-location.entity";
import { RouteEstimationService } from "./route-estimation.service";
import { RiderTrackingService } from "./rider-tracking.service";

@Module({
  imports: [RealtimeModule, TypeOrmModule.forFeature([MasterOrder, RiderLocation])],
  providers: [RouteEstimationService, RiderTrackingService],
})
export class TrackingModule {}
