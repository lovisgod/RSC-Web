import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "../auth/auth.module";
import { AuditController } from "./audit.controller";
import { AuditInterceptor } from "./audit.interceptor";
import { AuditLog } from "./audit-log.entity";
import { AuditService } from "./audit.service";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditController],
  providers: [
    AuditService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [AuditService],
})
export class AuditModule {}
