import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../auth/user-role.enum";
import { ApiMessage } from "../common/http/api-message.decorator";
import { AuditService } from "./audit.service";
import { AuditLogQueryDto } from "./dto/audit-log-query.dto";

@ApiTags("Audit Logs")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller({ path: "audit-logs", version: "1" })
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiMessage("Audit logs retrieved")
  @ApiOperation({
    summary: "List audit logs",
    description:
      "Super-admin endpoint for reviewing successful mutating API actions across auth, users, catalog, orders, payments, finance, delivery, riders, notifications, and admin workflows.",
  })
  list(@Query() query: AuditLogQueryDto) {
    return this.audit.list(query);
  }
}
