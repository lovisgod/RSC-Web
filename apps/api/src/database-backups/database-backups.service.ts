import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { spawn } from "node:child_process";
import { mkdir, stat, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DataSource, Repository } from "typeorm";

import { EMAIL_SENDER, type EmailSender } from "../auth/email/email-sender";
import type { AuthenticatedUser } from "../auth/authenticated-user";
import type { ApplicationConfig } from "../config/configuration";
import { DatabaseBackupSettings } from "./database-backup-settings.entity";
import type {
  DatabaseBackupSettingsDto,
  DatabaseBackupRunResultDto,
  UpdateDatabaseBackupSettingsDto,
} from "./dto/database-backup.dto";

const CHECK_INTERVAL_MS = 60_000;
const DEFAULT_INTERVAL_MINUTES = 1440;
const DEFAULT_MAX_ATTACHMENT_MB = 20;

interface DumpResult {
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
}

@Injectable()
export class DatabaseBackupsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseBackupsService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  constructor(
    @InjectRepository(DatabaseBackupSettings)
    private readonly settingsRepository: Repository<DatabaseBackupSettings>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService<ApplicationConfig, true>,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
  ) {}

  onModuleInit(): void {
    if (this.configService.get("app.environment", { infer: true }) === "test") {
      return;
    }

    this.timer = setInterval(() => {
      void this.runDueBackup();
    }, CHECK_INTERVAL_MS);
    void this.runDueBackup().catch((error: unknown) => {
      this.logger.error(
        `Database backup scheduler failed during startup: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    });
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async getSettings(): Promise<DatabaseBackupSettingsDto> {
    return this.toSettingsDto(await this.ensureSettings());
  }

  async updateSettings(
    input: UpdateDatabaseBackupSettingsDto,
    actor: AuthenticatedUser,
  ): Promise<DatabaseBackupSettingsDto> {
    const settings = await this.ensureSettings();
    const nextInterval = input.intervalMinutes ?? settings.intervalMinutes;
    const nextRecipient =
      input.recipientEmail !== undefined
        ? input.recipientEmail.trim().toLowerCase()
        : settings.recipientEmail;
    const nextEnabled = input.isEnabled ?? settings.isEnabled;

    if (nextEnabled && !nextRecipient) {
      throw new BadRequestException("Backup recipient email is required before enabling backups");
    }

    settings.intervalMinutes = nextInterval;
    settings.recipientEmail = nextRecipient || null;
    settings.isEnabled = nextEnabled;
    settings.updatedById = actor.id;
    settings.nextRunAt = nextEnabled ? addMinutes(new Date(), nextInterval) : null;
    settings.lastError =
      nextEnabled && settings.lastStatus === "FAILED" ? settings.lastError : null;

    return this.toSettingsDto(await this.settingsRepository.save(settings));
  }

  async runManualBackup(actor: AuthenticatedUser): Promise<DatabaseBackupRunResultDto> {
    const settings = await this.ensureSettings();
    settings.updatedById = actor.id;

    return this.runBackup(settings);
  }

  private async runDueBackup(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    const settings = await this.ensureSettings();
    if (!settings.isEnabled || !settings.nextRunAt || settings.nextRunAt > new Date()) {
      return;
    }

    try {
      await this.runBackup(settings);
    } catch (error) {
      this.logger.error(
        `Scheduled database backup failed: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  private async runBackup(settings: DatabaseBackupSettings): Promise<DatabaseBackupRunResultDto> {
    if (this.isRunning) {
      throw new BadRequestException("A database backup is already running");
    }
    if (!settings.recipientEmail) {
      throw new BadRequestException("Backup recipient email is not configured");
    }

    const lockConnection = this.dataSource.createQueryRunner();
    await lockConnection.connect();
    const [lock] = (await lockConnection.query(
      "SELECT pg_try_advisory_lock(951753824) AS acquired",
    )) as Array<{ acquired: boolean }>;
    if (!lock?.acquired) {
      await lockConnection.release();
      throw new BadRequestException("A database backup is already running on another API instance");
    }

    this.isRunning = true;
    settings.lastStatus = "RUNNING";
    settings.lastError = null;

    let dump: DumpResult | null = null;
    try {
      await this.settingsRepository.save(settings);
      dump = await this.createDump();
      const maxBytes = this.maxAttachmentBytes();
      if (dump.fileSizeBytes > maxBytes) {
        throw new Error(
          `Backup is ${(dump.fileSizeBytes / 1024 / 1024).toFixed(1)}MB, above the configured ${(
            maxBytes /
            1024 /
            1024
          ).toFixed(1)}MB email attachment limit`,
        );
      }

      await this.emailSender.sendDatabaseBackup({
        email: settings.recipientEmail,
        fileName: dump.fileName,
        filePath: dump.filePath,
        fileSizeBytes: dump.fileSizeBytes,
        createdAt: new Date(),
      });

      const completedAt = new Date();
      settings.lastRunAt = completedAt;
      settings.nextRunAt = settings.isEnabled
        ? addMinutes(completedAt, settings.intervalMinutes)
        : null;
      settings.lastStatus = "SUCCESS";
      settings.lastError = null;
      settings.lastFileName = dump.fileName;
      settings.lastFileSizeBytes = dump.fileSizeBytes;
      await this.settingsRepository.save(settings);

      return {
        sent: true,
        fileName: dump.fileName,
        fileSizeBytes: dump.fileSizeBytes,
        recipientEmail: settings.recipientEmail,
        completedAt: completedAt.toISOString(),
      };
    } catch (error) {
      const failedAt = new Date();
      settings.lastRunAt = failedAt;
      settings.nextRunAt = settings.isEnabled
        ? addMinutes(failedAt, settings.intervalMinutes)
        : null;
      settings.lastStatus = "FAILED";
      settings.lastError = error instanceof Error ? error.message : "Database backup failed";
      await this.settingsRepository.save(settings);
      throw error;
    } finally {
      this.isRunning = false;
      if (dump) {
        await unlink(dump.filePath).catch(() => undefined);
      }
      await lockConnection.query("SELECT pg_advisory_unlock(951753824)").catch(() => undefined);
      await lockConnection.release();
    }
  }

  private async createDump(): Promise<DumpResult> {
    const databaseUrl = this.configService.get("database.url", { infer: true });
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not configured");
    }

    const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
    const directory = join(tmpdir(), "rsc-db-backups");
    const fileName = `rsc-db-backup-${timestamp}.dump`;
    const filePath = join(directory, fileName);

    await mkdir(directory, { recursive: true });
    await this.runPgDump(databaseUrl, filePath);

    return {
      fileName,
      filePath,
      fileSizeBytes: (await stat(filePath)).size,
    };
  }

  private runPgDump(databaseUrl: string, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(
        "pg_dump",
        [
          "--dbname",
          databaseUrl,
          "--format=custom",
          "--no-owner",
          "--no-privileges",
          "--file",
          filePath,
        ],
        { stdio: ["ignore", "ignore", "pipe"] },
      );
      const stderr: Buffer[] = [];

      child.stderr.on("data", (chunk: Buffer) => {
        stderr.push(chunk);
      });
      child.on("error", (error) => {
        reject(new Error(`pg_dump could not start: ${error.message}`));
      });
      child.on("close", (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(
          new Error(
            `pg_dump exited with code ${code ?? "unknown"}: ${Buffer.concat(stderr)
              .toString("utf8")
              .slice(0, 1000)}`,
          ),
        );
      });
    });
  }

  private async ensureSettings(): Promise<DatabaseBackupSettings> {
    const [existing] = await this.settingsRepository.find({
      order: { createdAt: "ASC" },
      take: 1,
    });
    if (existing) {
      return existing;
    }

    return this.settingsRepository.save(
      this.settingsRepository.create({
        isEnabled: false,
        intervalMinutes: DEFAULT_INTERVAL_MINUTES,
        recipientEmail: null,
        lastRunAt: null,
        nextRunAt: null,
        lastStatus: "NEVER_RUN",
        lastError: null,
        lastFileName: null,
        lastFileSizeBytes: null,
        updatedById: null,
      }),
    );
  }

  private toSettingsDto(settings: DatabaseBackupSettings): DatabaseBackupSettingsDto {
    return {
      id: settings.id,
      isEnabled: settings.isEnabled,
      intervalMinutes: settings.intervalMinutes,
      recipientEmail: settings.recipientEmail,
      lastRunAt: settings.lastRunAt?.toISOString() ?? null,
      nextRunAt: settings.nextRunAt?.toISOString() ?? null,
      lastStatus: settings.lastStatus,
      lastError: settings.lastError,
      lastFileName: settings.lastFileName,
      lastFileSizeBytes: settings.lastFileSizeBytes,
      updatedById: settings.updatedById,
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    };
  }

  private maxAttachmentBytes(): number {
    return (
      Number(process.env.DATABASE_BACKUP_MAX_ATTACHMENT_MB ?? DEFAULT_MAX_ATTACHMENT_MB) *
      1024 *
      1024
    );
  }
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}
