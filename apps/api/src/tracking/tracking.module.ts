import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { RealtimeModule } from "../realtime/realtime.module";
import { MasterOrder } from "../orders/master-order.entity";
import { RiderLocation } from "../riders/rider-location.entity";
import { NotificationsModule } from "../notifications/notifications.module";
import { RouteEstimationService } from "./route-estimation.service";
import { RiderTrackingIncident } from "./rider-tracking-incident.entity";
import { RiderTrackingService } from "./rider-tracking.service";

@Module({
  imports: [
    RealtimeModule,
    NotificationsModule,
    TypeOrmModule.forFeature([MasterOrder, RiderLocation, RiderTrackingIncident]),
  ],
  providers: [RouteEstimationService, RiderTrackingService],
})
export class TrackingModule {}
