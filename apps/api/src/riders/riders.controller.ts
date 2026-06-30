import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import type { AuthenticatedRequest } from "../auth/auth-request";
import { AuthGuard } from "../auth/auth.guard";
import { ApiMessage } from "../common/http/api-message.decorator";
import { RecordRiderLocationDto } from "./dto/rider-location.dto";
import { RidersService } from "./riders.service";

@ApiTags("Riders")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ path: "riders", version: "1" })
export class RidersController {
  constructor(private readonly riders: RidersService) {}

  @Post("locations")
  @ApiMessage("Rider location recorded")
  recordLocation(@Req() request: AuthenticatedRequest, @Body() input: RecordRiderLocationDto) {
    return this.riders.recordLocation(request.user!, input);
  }

  @Get("locations")
  @ApiMessage("Rider locations retrieved")
  listMine(@Req() request: AuthenticatedRequest) {
    return this.riders.listMine(request.user!);
  }
}
