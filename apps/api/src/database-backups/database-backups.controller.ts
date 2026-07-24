import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { DatabaseBackupsService } from "./database-backups.service";
import { UpdateDatabaseBackupSettingsDto } from "./dto/database-backup.dto";

@ApiTags("Database Backups")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.OWNER)
@Controller({ path: "system/backups", version: "1" })
export class DatabaseBackupsController {
  constructor(private readonly backups: DatabaseBackupsService) {}

  @Get("settings")
  @ApiMessage("Database backup settings retrieved")
  @ApiOperation({ summary: "Owner-only endpoint for reading database backup settings" })
  getSettings() {
    return this.backups.getSettings();
  }

  @Put("settings")
  @ApiMessage("Database backup settings updated")
  @ApiOperation({ summary: "Owner-only endpoint for configuring scheduled database backups" })
  updateSettings(
    @Req() request: AuthenticatedRequest,
    @Body() input: UpdateDatabaseBackupSettingsDto,
  ) {
    return this.backups.updateSettings(input, request.user!);
  }

  @Post("run")
  @HttpCode(HttpStatus.OK)
  @ApiMessage("Database backup sent")
  @ApiOperation({ summary: "Owner-only endpoint for immediately sending a database backup" })
  runNow(@Req() request: AuthenticatedRequest) {
    return this.backups.runManualBackup(request.user!);
  }
}
