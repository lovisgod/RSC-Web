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
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import type { AuthenticatedRequest } from "../auth/auth-request";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../auth/user-role.enum";
import { ApiMessage } from "../common/http/api-message.decorator";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator";
import { DeliveryService } from "./delivery.service";
import {
  AddressSuggestionsQueryDto,
  CreateDeliveryAddressDto,
  ResolveAddressDto,
  UpdateDeliveryAddressDto,
  ValidateAddressDto,
} from "./dto/delivery-address.dto";
import { CreateGeofenceZoneDto, UpdateGeofenceZoneDto } from "./dto/geofence-zone.dto";

@ApiTags("Delivery")
@Controller({ path: "delivery", version: "1" })
export class DeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  @Post("validate-address")
  @RateLimit({ limit: 30, windowSeconds: 60 })
  @HttpCode(HttpStatus.OK)
  @ApiMessage("Delivery address validated")
  @ApiOperation({
    summary: "Validate delivery address",
    description:
      "Validates that a delivery address falls within the serviceable geofence zone and is reachable.",
  })
  validateAddress(@Body() input: ValidateAddressDto) {
    return this.delivery.validateAddress(input);
  }

  @Get("address-suggestions")
  @RateLimit({ limit: 60, windowSeconds: 60 })
  @ApiMessage("Delivery address suggestions retrieved")
  @ApiOperation({
    summary: "Get address suggestions",
    description: "Retrieves autocomplete address suggestions based on a query string.",
  })
  addressSuggestions(@Query() query: AddressSuggestionsQueryDto) {
    return this.delivery.searchAddressSuggestions(query);
  }

  @Post("resolve-address")
  @RateLimit({ limit: 30, windowSeconds: 60 })
  @HttpCode(HttpStatus.OK)
  @ApiMessage("Delivery address resolved")
  @ApiOperation({
    summary: "Resolve delivery address coordinates",
    description: "Resolves the precise coordinates (latitude, longitude) of a given text address.",
  })
  resolveAddress(@Body() input: ResolveAddressDto) {
    return this.delivery.resolveAddress(input);
  }

  @Get("geofence-zones")
  @ApiMessage("Geofence zones retrieved")
  @ApiOperation({
    summary: "List geofence zones",
    description: "Retrieves all geofence zones configured in the system.",
  })
  listGeofenceZones() {
    return this.delivery.listGeofenceZones();
  }

  @Get("geofence-zones/:id")
  @ApiMessage("Geofence zone retrieved")
  @ApiOperation({
    summary: "Get geofence zone detail",
    description: "Retrieves the details of a specific geofence zone by ID.",
  })
  getGeofenceZone(@Param("id") id: string) {
    return this.delivery.getGeofenceZone(id);
  }

  @Post("geofence-zones")
  @RateLimit({ limit: 10, windowSeconds: 600 })
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiMessage("Geofence zone created successfully")
  @ApiOperation({
    summary: "Create geofence zone",
    description: "Allows a super admin to create a new delivery geofence zone polygon.",
  })
  createGeofenceZone(@Body() input: CreateGeofenceZoneDto) {
    return this.delivery.createGeofenceZone(input);
  }

  @Patch("geofence-zones/:id")
  @RateLimit({ limit: 10, windowSeconds: 600 })
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiMessage("Geofence zone updated successfully")
  @ApiOperation({
    summary: "Update geofence zone",
    description:
      "Allows a super admin to modify an existing geofence zone's properties or coordinates.",
  })
  updateGeofenceZone(@Param("id") id: string, @Body() input: UpdateGeofenceZoneDto) {
    return this.delivery.updateGeofenceZone(id, input);
  }

  @Delete("geofence-zones/:id")
  @RateLimit({ limit: 10, windowSeconds: 600 })
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiMessage("Geofence zone deleted successfully")
  @ApiOperation({
    summary: "Delete geofence zone",
    description: "Allows a super admin to delete a geofence zone from the system.",
  })
  deleteGeofenceZone(@Param("id") id: string) {
    return this.delivery.deleteGeofenceZone(id);
  }

  @Get("addresses")
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiMessage("Delivery addresses retrieved")
  @ApiOperation({
    summary: "List customer saved addresses",
    description: "Retrieves the list of saved delivery addresses for the authenticated customer.",
  })
  listAddresses(@Req() request: AuthenticatedRequest) {
    return this.delivery.listAddresses(request.user!);
  }

  @Post("addresses")
  @RateLimit({ limit: 20, windowSeconds: 60 })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiMessage("Delivery address created successfully")
  @ApiOperation({
    summary: "Save customer delivery address",
    description: "Saves a new delivery address for the authenticated customer.",
  })
  createAddress(@Req() request: AuthenticatedRequest, @Body() input: CreateDeliveryAddressDto) {
    return this.delivery.createAddress(request.user!, input);
  }

  @Get("addresses/:id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiMessage("Delivery address retrieved")
  @ApiOperation({
    summary: "Get saved delivery address detail",
    description: "Retrieves the details of a saved delivery address by ID.",
  })
  getAddress(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.delivery.getAddress(request.user!, id);
  }

  @Patch("addresses/:id")
  @RateLimit({ limit: 20, windowSeconds: 60 })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiMessage("Delivery address updated successfully")
  @ApiOperation({
    summary: "Update saved delivery address",
    description: "Updates the details of a saved delivery address for the authenticated customer.",
  })
  updateAddress(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() input: UpdateDeliveryAddressDto,
  ) {
    return this.delivery.updateAddress(request.user!, id, input);
  }

  @Patch("addresses/:id/default")
  @RateLimit({ limit: 20, windowSeconds: 60 })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiMessage("Default delivery address updated")
  @ApiOperation({
    summary: "Set default delivery address",
    description:
      "Sets a saved delivery address as the default address for the authenticated customer.",
  })
  setDefaultAddress(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.delivery.setDefaultAddress(request.user!, id);
  }

  @Delete("addresses/:id")
  @RateLimit({ limit: 20, windowSeconds: 60 })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiMessage("Delivery address deleted successfully")
  @ApiOperation({
    summary: "Delete saved delivery address",
    description: "Deletes a saved delivery address for the authenticated customer.",
  })
  deleteAddress(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.delivery.deleteAddress(request.user!, id);
  }
}
