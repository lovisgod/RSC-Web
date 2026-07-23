import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsEmail, IsInt, IsOptional, Max, Min } from "class-validator";

import type { DatabaseBackupStatus } from "../database-backup-settings.entity";

const trimLower = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim().toLowerCase() : value;

export class UpdateDatabaseBackupSettingsDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    example: 1440,
    minimum: 15,
    maximum: 10080,
    description: "How often the database backup should run, in minutes.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(10080)
  intervalMinutes?: number;

  @ApiPropertyOptional({ example: "owner@rscdev.tech" })
  @IsOptional()
  @Transform(trimLower)
  @IsEmail()
  recipientEmail?: string;
}

export interface DatabaseBackupSettingsDto {
  id: string;
  isEnabled: boolean;
  intervalMinutes: number;
  recipientEmail: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastStatus: DatabaseBackupStatus;
  lastError: string | null;
  lastFileName: string | null;
  lastFileSizeBytes: number | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export class DatabaseBackupRunResultDto {
  @ApiProperty({ example: true })
  sent!: true;

  @ApiProperty({ example: "rsc-db-backup-2026-07-22T12-00-00-000Z.dump" })
  fileName!: string;

  @ApiProperty({ example: 412567 })
  fileSizeBytes!: number;

  @ApiProperty({ example: "owner@rscdev.tech" })
  recipientEmail!: string;

  @ApiProperty({ example: "2026-07-22T12:00:00.000Z" })
  completedAt!: string;
}
