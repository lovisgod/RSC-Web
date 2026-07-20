import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import type { UserRole } from "../auth/user-role.enum";
import { AuditLog } from "./audit-log.entity";
import type { AuditLogQueryDto } from "./dto/audit-log-query.dto";

export interface CreateAuditLogInput {
  actorId: string | null;
  actorRole: UserRole | null;
  action: string;
  method: string;
  path: string;
  statusCode: number;
  resourceType: string | null;
  resourceId: string | null;
  requestId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
}

export interface AuditLogListResult {
  auditLogs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
  next: number | null;
  previous: number | null;
  hasNext: boolean;
  hasPrevious: boolean;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@InjectRepository(AuditLog) private readonly auditLogs: Repository<AuditLog>) {}

  async record(input: CreateAuditLogInput): Promise<void> {
    try {
      await this.auditLogs.save(this.auditLogs.create(input));
    } catch (error) {
      this.logger.error(
        `Failed to record audit log: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  async list(query: AuditLogQueryDto = {}): Promise<AuditLogListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const offset = (page - 1) * limit;
    const qb = this.auditLogs.createQueryBuilder("auditLog");

    if (query.actorId) {
      qb.andWhere("auditLog.actorId = :actorId", { actorId: query.actorId });
    }

    if (query.action) {
      qb.andWhere("auditLog.action ILIKE :action", { action: `%${query.action}%` });
    }

    if (query.resourceType) {
      qb.andWhere("auditLog.resourceType = :resourceType", { resourceType: query.resourceType });
    }

    if (query.resourceId) {
      qb.andWhere("auditLog.resourceId = :resourceId", { resourceId: query.resourceId });
    }

    if (query.dateFrom) {
      qb.andWhere("auditLog.createdAt >= :dateFrom", { dateFrom: new Date(query.dateFrom) });
    }

    if (query.dateTo) {
      qb.andWhere("auditLog.createdAt <= :dateTo", { dateTo: new Date(query.dateTo) });
    }

    const [auditLogs, total] = await qb
      .orderBy("auditLog.createdAt", "DESC")
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    return {
      auditLogs,
      total,
      limit,
      offset,
      ...paginationMeta(total, limit, offset),
    };
  }
}

function paginationMeta(total: number, limit: number, offset: number) {
  const next = offset + limit < total ? offset + limit : null;
  const previous = offset > 0 ? Math.max(0, offset - limit) : null;

  return {
    next,
    previous,
    hasNext: next !== null,
    hasPrevious: previous !== null,
  };
}
