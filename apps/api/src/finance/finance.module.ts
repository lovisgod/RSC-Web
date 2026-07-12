import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Outlet } from "../outlets/outlet.entity";
import { FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";
import { OutletSettlementApproval } from "./outlet-settlement-approval.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Outlet, OutletSettlementApproval])],
  controllers: [FinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}
