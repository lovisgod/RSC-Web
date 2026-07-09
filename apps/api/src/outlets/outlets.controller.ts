import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import type { AuthenticatedRequest } from "../auth/auth-request";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../auth/user-role.enum";
import { ApiMessage } from "../common/http/api-message.decorator";
import { ProvisionSubaccountDto, SetSubaccountCodeDto } from "./dto/outlet.dto";
import { OutletsService } from "./outlets.service";

@ApiTags("Outlets")
@Controller({ path: "outlets", version: "1" })
export class OutletsController {
  constructor(private readonly outlets: OutletsService) {}

  @Get()
  @ApiMessage("Outlets retrieved")
  listAll() {
    return this.outlets.findAll();
  }

  @Get(":id")
  @ApiMessage("Outlet retrieved")
  getOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.outlets.findOne(id);
  }

  /**
   * Register an outlet's bank account with Paystack.
   * Creates a Paystack subaccount and saves the ACCT_xxx code back to the outlet.
   * SUPER_ADMIN or own outlet's ADMIN only.
   */
  @Post(":id/subaccount")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: "Provision Paystack subaccount for an outlet",
    description:
      "Calls the Paystack subaccount API with the outlet's bank details. " +
      "Idempotent — pass force=true to re-provision.",
  })
  @ApiMessage("Outlet subaccount provisioned")
  async provisionSubaccount(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: ProvisionSubaccountDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const user = request.user!;
    await this.outlets.checkOwnOutletAccess(user.id, user.role, id);
    return this.outlets.provisionSubaccount(id, input, input.force);
  }

  /**
   * Manually assign a Paystack subaccount code that was registered externally
   * (e.g. via Paystack dashboard rather than the API).
   * SUPER_ADMIN or own outlet's ADMIN only.
   */
  @Put(":id/subaccount-code")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: "Manually set an outlet's Paystack subaccount code",
    description:
      "Use when the subaccount was created outside the API. " + "Code must start with ACCT_.",
  })
  @ApiMessage("Subaccount code updated")
  async setSubaccountCode(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: SetSubaccountCodeDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const user = request.user!;
    await this.outlets.checkOwnOutletAccess(user.id, user.role, id);
    return this.outlets.setSubaccountCode(id, input.subaccountCode);
  }
}
