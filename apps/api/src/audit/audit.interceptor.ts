import {
  HttpException,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { tap } from "rxjs";
import type { Observable } from "rxjs";

import type { AuthenticatedUser } from "../auth/authenticated-user";
import { AuditService } from "./audit.service";

const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);
const HIGH_FREQUENCY_PATHS = new Set(["/api/v1/riders/locations"]);
const SENSITIVE_KEYS = new Set([
  "accessToken",
  "access_token",
  "apiKey",
  "api_key",
  "authorization",
  "card",
  "code",
  "currentPassword",
  "cvv",
  "email",
  "emailHash",
  "emailEncrypted",
  "firebasePrivateKey",
  "identifier",
  "newPassword",
  "otp",
  "pass",
  "password",
  "passwordHash",
  "phone",
  "phoneHash",
  "phoneEncrypted",
  "privateKey",
  "refreshToken",
  "refresh_token",
  "secret",
  "secretKey",
  "signature",
  "token",
]);

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
  rawBody?: Buffer;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithUser>();
    const response = http.getResponse<Response>();
    const method = request.method.toUpperCase();

    if (!MUTATING_METHODS.has(method)) {
      return next.handle();
    }

    const path = normalizePath(request.originalUrl ?? request.url);
    if (HIGH_FREQUENCY_PATHS.has(path)) {
      return next.handle();
    }

    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          void this.record(request, response, method, startedAt, response.statusCode);
        },
        error: (error: unknown) => {
          const statusCode = error instanceof HttpException ? error.getStatus() : 500;
          void this.record(request, response, method, startedAt, statusCode, error);
        },
      }),
    );
  }

  private record(
    request: RequestWithUser,
    response: Response,
    method: string,
    startedAt: number,
    statusCode: number,
    error?: unknown,
  ): Promise<void> {
    const path = normalizePath(request.originalUrl ?? request.url);

    return this.audit.record({
      actorId: request.user?.id ?? null,
      actorRole: request.user?.role ?? null,
      action: `${method} ${path}`,
      method,
      path,
      statusCode,
      resourceType: resourceTypeFromPath(path),
      resourceId: resourceIdFromParams(request.params),
      requestId: response.getHeader("x-request-id")?.toString() ?? null,
      ipAddress: request.ip ?? request.socket.remoteAddress ?? null,
      userAgent: request.header("user-agent")?.slice(0, 512) ?? null,
      metadata: {
        params: redactValue(request.params),
        query: redactValue(request.query),
        body: redactValue(request.body),
        durationMs: Date.now() - startedAt,
        ...(error
          ? {
              error: {
                name: error instanceof Error ? error.name : "Error",
                message: error instanceof Error ? error.message : "Request failed",
              },
            }
          : {}),
      },
    });
  }
}

function normalizePath(url: string): string {
  return url.split("?")[0] ?? url;
}

function resourceTypeFromPath(path: string): string | null {
  const segments = path.split("/").filter(Boolean);
  const apiIndex = segments.findIndex((segment) => segment === "api");
  const versionIndex = apiIndex >= 0 ? apiIndex + 1 : -1;
  const resourceIndex =
    versionIndex >= 0 && /^v\d+$/.test(segments[versionIndex] ?? "")
      ? versionIndex + 1
      : apiIndex + 1;

  return segments[resourceIndex] ?? null;
}

function resourceIdFromParams(params: Record<string, unknown>): string | null {
  for (const key of ["id", "orderId", "reference", "subOrderId", "outletId", "zoneId"]) {
    const value = params[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim().slice(0, 160);
    }
  }

  return null;
}

function redactValue(value: unknown, depth = 0): unknown {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value === "string") {
    return value.length > 512 ? `${value.slice(0, 512)}...` : value;
  }

  if (typeof value !== "object") {
    return value;
  }

  if (depth >= 4) {
    return "[MaxDepth]";
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redactValue(item, depth + 1));
  }

  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    output[key] = isSensitiveKey(key) ? "[REDACTED]" : redactValue(item, depth + 1);
  }

  return output;
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.replaceAll(/[-_\s]/g, "").toLowerCase();

  return [...SENSITIVE_KEYS].some(
    (sensitiveKey) => normalized === sensitiveKey.replaceAll(/[-_\s]/g, "").toLowerCase(),
  );
}
