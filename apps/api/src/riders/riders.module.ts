import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "../auth/auth.module";
import { MasterOrder } from "../orders/master-order.entity";
import { SubOrder } from "../orders/sub-order.entity";
import { RealtimeModule } from "../realtime/realtime.module";
import { RiderLocation } from "./rider-location.entity";
import { RidersController } from "./riders.controller";
import { RidersService } from "./riders.service";

@Module({
  imports: [
    AuthModule,
    RealtimeModule,
    TypeOrmModule.forFeature([RiderLocation, MasterOrder, SubOrder]),
  ],
  controllers: [RidersController],
  providers: [RidersService],
})
export class RidersModule {}
