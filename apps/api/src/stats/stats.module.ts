import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "../auth/auth.module";
import { Customer } from "../auth/customer.entity";
import { StatsController } from "./stats.controller";
import { StatsService } from "./stats.service";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Customer])],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
