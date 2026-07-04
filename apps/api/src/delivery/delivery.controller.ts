import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import type { AuthenticatedRequest } from "../auth/auth-request";
import { AuthGuard } from "../auth/auth.guard";
import { ApiMessage } from "../common/http/api-message.decorator";
import { DeliveryService } from "./delivery.service";
import {
  CreateDeliveryAddressDto,
  UpdateDeliveryAddressDto,
  ValidateAddressDto,
} from "./dto/delivery-address.dto";

@ApiTags("Delivery")
@Controller({ path: "delivery", version: "1" })
export class DeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  @Post("validate-address")
  @HttpCode(HttpStatus.OK)
  @ApiMessage("Delivery address validated")
  validateAddress(@Body() input: ValidateAddressDto) {
    return this.delivery.validateAddress(input);
  }

  @Get("geofence-zones")
  @ApiMessage("Geofence zones retrieved")
  listGeofenceZones() {
    return this.delivery.listGeofenceZones();
  }

  @Get("addresses")
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiMessage("Delivery addresses retrieved")
  listAddresses(@Req() request: AuthenticatedRequest) {
    return this.delivery.listAddresses(request.user!);
  }

  @Post("addresses")
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiMessage("Delivery address created successfully")
  createAddress(@Req() request: AuthenticatedRequest, @Body() input: CreateDeliveryAddressDto) {
    return this.delivery.createAddress(request.user!, input);
  }

  @Get("addresses/:id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiMessage("Delivery address retrieved")
  getAddress(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.delivery.getAddress(request.user!, id);
  }

  @Patch("addresses/:id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiMessage("Delivery address updated successfully")
  updateAddress(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() input: UpdateDeliveryAddressDto,
  ) {
    return this.delivery.updateAddress(request.user!, id, input);
  }

  @Patch("addresses/:id/default")
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiMessage("Default delivery address updated")
  setDefaultAddress(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.delivery.setDefaultAddress(request.user!, id);
  }

  @Delete("addresses/:id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiMessage("Delivery address deleted successfully")
  deleteAddress(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.delivery.deleteAddress(request.user!, id);
  }
}
