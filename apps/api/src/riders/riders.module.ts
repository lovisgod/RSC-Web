import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "../auth/auth.module";
import { RiderLocation } from "./rider-location.entity";
import { RidersController } from "./riders.controller";
import { RidersService } from "./riders.service";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([RiderLocation])],
  controllers: [RidersController],
  providers: [RidersService],
})
export class RidersModule {}
