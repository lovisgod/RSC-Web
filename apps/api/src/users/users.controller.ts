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
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import type { AuthenticatedRequest } from "../auth/auth-request";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../auth/user-role.enum";
import { ApiMessage } from "../common/http/api-message.decorator";
import type { UploadedImageFile } from "../media/media.service";
import { UpdateProfileDto, VerifyProfileChangeDto } from "./dto/profile.dto";
import { OutletAdminQueryDto } from "./dto/outlet-admin-query.dto";
import { CreateRiderDto, UpdateRiderDto } from "./dto/rider.dto";
import { UsersService } from "./users.service";

@ApiTags("Users")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ path: "users", version: "1" })
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get("me")
  @ApiMessage("Profile retrieved")
  me(@Req() request: AuthenticatedRequest) {
    return this.users.getProfile(request.user!);
  }

  @Post("me")
  @HttpCode(HttpStatus.OK)
  @ApiMessage("Profile updated")
  @ApiOperation({
    summary: "Update the active user's profile",
    description:
      "Changing phone or email sends an OTP. Verify that OTP with POST /api/v1/users/me/verify-change, not /api/v1/auth/verify-user.",
  })
  @ApiOkResponse({
    description: "Profile updated; otpExpiresInSeconds is set when verification is pending",
  })
  updateProfile(@Req() request: AuthenticatedRequest, @Body() input: UpdateProfileDto) {
    return this.users.updateProfile(request.user!, input);
  }

  @Post("me/verify-change")
  @HttpCode(HttpStatus.OK)
  @ApiMessage("Profile change verified")
  @ApiOperation({
    summary: "Verify a pending profile phone or email change",
    description:
      "Use this authenticated endpoint for OTPs sent after updating a profile. Send only the code; the API resolves phone vs email from the OTP. The public /auth/verify-user endpoint is only for registration OTPs.",
  })
  @ApiOkResponse({ description: "Pending phone or email change verified" })
  @ApiBadRequestResponse({ description: "No pending change exists for the selected channel" })
  @ApiUnauthorizedResponse({ description: "OTP is incorrect, expired, or already consumed" })
  verifyProfileChange(@Req() request: AuthenticatedRequest, @Body() input: VerifyProfileChangeDto) {
    return this.users.verifyProfileChange(request.user!, input);
  }

  @Post("me/avatar")
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiMessage("Avatar uploaded successfully")
  uploadAvatar(@Req() request: AuthenticatedRequest, @UploadedFile() file: UploadedImageFile) {
    return this.users.uploadAvatar(request.user!, file);
  }

  @Post("me/deactivate")
  @HttpCode(HttpStatus.OK)
  @ApiMessage("Account deactivated successfully")
  deactivateAccount(@Req() request: AuthenticatedRequest) {
    return this.users.deactivateAccount(request.user!);
  }

  @Post("riders")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Rider created successfully")
  @ApiOperation({
    summary: "Create a rider account",
    description:
      "Admin endpoint for creating a delivery rider account. Super admins can create platform riders; outlet admins can create riders for operational delivery workflows.",
  })
  createRider(@Req() request: AuthenticatedRequest, @Body() input: CreateRiderDto) {
    return this.users.createRider(request.user!, input);
  }

  @Get("riders")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Riders retrieved successfully")
  @ApiOperation({
    summary: "List delivery riders",
    description:
      "Returns a list of riders. Super admins can retrieve all riders or filter by outletId. Outlet admins can only retrieve riders for their own outlet.",
  })
  listRiders(@Req() request: AuthenticatedRequest, @Query("outletId") outletId?: string) {
    return this.users.listRiders(request.user!, outletId);
  }

  @Get("riders/:id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Rider retrieved successfully")
  @ApiOperation({
    summary: "Get a rider's details",
    description:
      "Returns details of a specific rider. Super admins can retrieve any rider. Outlet admins can only retrieve riders linked to their own outlet.",
  })
  getRider(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.users.getRider(request.user!, id);
  }

  @Patch("riders/:id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Rider updated successfully")
  @ApiOperation({
    summary: "Update a rider's details",
    description:
      "Updates details of a specific rider. Super admins can update any rider. Outlet admins can only update riders linked to their own outlet.",
  })
  updateRider(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() input: UpdateRiderDto,
  ) {
    return this.users.updateRider(request.user!, id, input);
  }

  @Delete("riders/:id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Rider deleted successfully")
  @ApiOperation({
    summary: "Soft-delete a rider",
    description:
      "Soft-deletes a rider account. Super admins can delete any rider. Outlet admins can only delete riders linked to their own outlet.",
  })
  deleteRider(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.users.deleteRider(request.user!, id);
  }

  @Get("outlet-admins")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiMessage("Outlet admins retrieved")
  @ApiOperation({
    summary: "List outlet admins",
    description:
      "Returns outlet admin users for the super admin management screen. Pass outletId to list admins for one outlet. Soft-deleted admins are excluded.",
  })
  listOutletAdmins(@Req() request: AuthenticatedRequest, @Query() query: OutletAdminQueryDto) {
    return this.users.listOutletAdmins(request.user!, query);
  }

  @Delete("outlet-admins/:id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiMessage("Outlet admin deleted successfully")
  @ApiOperation({
    summary: "Soft-delete an outlet admin",
    description:
      "Soft-deletes an outlet admin account. This endpoint only deletes users with the ADMIN role.",
  })
  deleteOutletAdmin(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.users.deleteOutletAdmin(request.user!, id);
  }

  @Delete(":id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiMessage("User deleted successfully")
  deleteUser(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.users.deleteUser(request.user!, id);
  }
}
