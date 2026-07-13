import { Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import type { AuthenticatedRequest } from "../auth/auth-request";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../auth/user-role.enum";
import { ApiMessage } from "../common/http/api-message.decorator";
import { FinanceService } from "./finance.service";

@ApiTags("Finance")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller({ path: "finance", version: "1" })
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get("outlet-settlements")
  @ApiMessage("Outlet settlements retrieved")
  @ApiOperation({
    summary: "Get outlet settlement reconciliation rows",
    description:
      "Aggregates completed, successfully paid outlet sub-orders with persisted approval status.",
  })
  outletSettlements(
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("outletId") outletId?: string,
  ) {
    return this.finance.outletSettlements(toOutletSettlementQuery({ dateFrom, dateTo, outletId }));
  }

  @Get("outlet-settlements/export")
  @ApiMessage("Outlet settlement export retrieved")
  @ApiOperation({
    summary: "Export outlet settlement report from Moment",
    description:
      "Fetches the provider settlement report for the selected date window and optional outlet.",
  })
  exportOutletSettlements(
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("outletId") outletId?: string,
  ) {
    return this.finance.exportOutletSettlements(
      toOutletSettlementQuery({ dateFrom, dateTo, outletId }),
    );
  }

  @Post("outlet-settlements/:outletId/approve")
  @ApiMessage("Outlet settlement approved")
  @ApiOperation({
    summary: "Approve pending settlement rows for an outlet",
    description:
      "Persists approval records for all currently pending completed, successfully paid sub-orders.",
  })
  approveOutletSettlement(
    @Param("outletId", ParseUUIDPipe) outletId: string,
    @Query("dateFrom") dateFrom: string | undefined,
    @Query("dateTo") dateTo: string | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.finance.approveOutletSettlement(
      outletId,
      request.user!,
      toOutletSettlementQuery({ dateFrom, dateTo }),
    );
  }
}

function toOutletSettlementQuery(input: {
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  outletId?: string | undefined;
}) {
  return {
    ...(input.dateFrom ? { dateFrom: input.dateFrom } : {}),
    ...(input.dateTo ? { dateTo: input.dateTo } : {}),
    ...(input.outletId ? { outletId: input.outletId } : {}),
  };
}
