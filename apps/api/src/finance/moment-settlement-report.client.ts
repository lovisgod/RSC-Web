import { BadGatewayException, BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import SftpClient from "ssh2-sftp-client";

import type { ApplicationConfig } from "../config/configuration";

export interface MomentSettlementFile {
  name: string;
  content: string;
}

@Injectable()
export class MomentSettlementReportClient {
  constructor(private readonly configService: ConfigService<ApplicationConfig, true>) {}

  async download(dateFrom: string, dateTo: string): Promise<MomentSettlementFile[]> {
    const config = this.configService.get("payments.moment", { infer: true });
    const username = config.sftpUsername.trim();
    const password = config.sftpPassword;
    const remoteDirectory = normalizeRemoteDirectory(config.settlementReportPath);

    if (!username || !password) {
      throw new BadRequestException("Moment settlement SFTP credentials are not configured");
    }

    const client = new SftpClient("moment-settlement-export");
    try {
      await client.connect({
        host: config.sftpHost,
        port: config.sftpPort,
        username,
        password,
        readyTimeout: 15_000,
      });

      const entries = await client.list(remoteDirectory);
      const files = entries
        .filter(
          (entry) => entry.type === "-" && isSettlementFileForWindow(entry.name, dateFrom, dateTo),
        )
        .sort((left, right) => left.name.localeCompare(right.name));

      if (files.length === 0) {
        throw new BadRequestException(
          "Moment has not produced a settlement report for the selected date window",
        );
      }

      return await Promise.all(
        files.map(async ({ name }) => {
          const result = await client.get(joinRemotePath(remoteDirectory, name));
          if (!Buffer.isBuffer(result)) {
            throw new Error("Moment SFTP returned an unexpected file payload");
          }
          const content = result.toString("utf8");
          return { name, content };
        }),
      );
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadGatewayException("Unable to retrieve settlement report from Moment SFTP");
    } finally {
      await client.end().catch(() => undefined);
    }
  }
}

function normalizeRemoteDirectory(value: string): string {
  const directory = value.trim();
  if (!directory.startsWith("/") || directory.includes("..") || directory.includes("\0")) {
    throw new BadRequestException(
      "Moment settlement report path must be an absolute SFTP directory",
    );
  }
  return directory.replace(/\/$/, "") || "/";
}

function joinRemotePath(directory: string, filename: string): string {
  return directory === "/" ? `/${filename}` : `${directory}/${filename}`;
}

export function isSettlementFileForWindow(
  filename: string,
  dateFrom: string,
  dateTo: string,
): boolean {
  if (!/_Moment_.*_Settlement_/i.test(filename) || !filename.toLowerCase().endsWith(".csv")) {
    return false;
  }

  const match = filename.match(/_(\d{8})\.csv$/i);
  if (!match?.[1]) return false;
  const periodEnd = `${match[1].slice(0, 4)}-${match[1].slice(4, 6)}-${match[1].slice(6, 8)}`;
  return periodEnd >= dateFrom && periodEnd <= dateTo;
}
