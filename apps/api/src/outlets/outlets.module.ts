import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Customer } from "../auth/customer.entity";
import { AuthModule } from "../auth/auth.module";
import { PaymentsModule } from "../payments/payments.module";
import { Outlet } from "./outlet.entity";
import { OutletsController } from "./outlets.controller";
import { OutletsService } from "./outlets.service";

@Module({
  imports: [TypeOrmModule.forFeature([Outlet, Customer]), AuthModule, PaymentsModule],
  controllers: [OutletsController],
  providers: [OutletsService],
  exports: [OutletsService, TypeOrmModule],
})
export class OutletsModule {}
