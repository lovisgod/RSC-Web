import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import type { AuthenticatedRequest } from "../auth/auth-request";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../auth/user-role.enum";
import { ApiMessage } from "../common/http/api-message.decorator";
import { UpdateProfileDto, VerifyProfileChangeDto } from "./dto/profile.dto";
import { CreateRiderDto } from "./dto/rider.dto";
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
  updateProfile(@Req() request: AuthenticatedRequest, @Body() input: UpdateProfileDto) {
    return this.users.updateProfile(request.user!, input);
  }

  @Post("me/verify-change")
  @HttpCode(HttpStatus.OK)
  @ApiMessage("Profile change verified")
  verifyProfileChange(@Req() request: AuthenticatedRequest, @Body() input: VerifyProfileChangeDto) {
    return this.users.verifyProfileChange(request.user!, input);
  }

  @Post("riders")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Rider created successfully")
  createRider(@Req() request: AuthenticatedRequest, @Body() input: CreateRiderDto) {
    return this.users.createRider(request.user!, input);
  }

  @Delete(":id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiMessage("User deleted successfully")
  deleteUser(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.users.deleteUser(request.user!, id);
  }
}
