import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "../auth/auth.module";
import { DatabaseBackupSettings } from "./database-backup-settings.entity";
import { DatabaseBackupsController } from "./database-backups.controller";
import { DatabaseBackupsService } from "./database-backups.service";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([DatabaseBackupSettings])],
  controllers: [DatabaseBackupsController],
  providers: [DatabaseBackupsService],
})
export class DatabaseBackupsModule {}
