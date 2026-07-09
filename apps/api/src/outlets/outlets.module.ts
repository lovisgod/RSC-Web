import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { PaymentsModule } from "../payments/payments.module";
import { Outlet } from "./outlet.entity";
import { OutletsController } from "./outlets.controller";
import { OutletsService } from "./outlets.service";

@Module({
  imports: [TypeOrmModule.forFeature([Outlet]), PaymentsModule],
  controllers: [OutletsController],
  providers: [OutletsService],
  exports: [OutletsService, TypeOrmModule],
})
export class OutletsModule {}
