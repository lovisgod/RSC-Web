import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch, HttpException, HttpStatus } from "@nestjs/common";
import type { Request, Response } from "express";

interface ErrorData {
  errors: string[];
  path: string;
  requestId: string | null;
  timestamp: string;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const messages = this.getMessages(exception);

    response.status(status).json({
      data: {
        errors: messages,
        path: request.originalUrl,
        requestId: response.getHeader("x-request-id")?.toString() ?? null,
        timestamp: new Date().toISOString(),
      } satisfies ErrorData,
      message: messages[0] ?? "Request failed",
      status,
    });
  }

  private getMessages(exception: unknown): string[] {
    if (!(exception instanceof HttpException)) {
      return ["Internal server error"];
    }

    const payload: unknown = exception.getResponse();

    if (typeof payload === "string") {
      return [payload];
    }

    if (isRecord(payload)) {
      const healthMessages = this.getHealthMessages(payload);

      if (healthMessages.length > 0) {
        return healthMessages;
      }

      const message = payload.message;

      if (Array.isArray(message) && message.every((item) => typeof item === "string")) {
        return message;
      }

      if (typeof message === "string") {
        return [message];
      }
    }

    return [exception.message || "Request failed"];
  }

  private getHealthMessages(payload: Record<string, unknown>): string[] {
    const entries = isRecord(payload.error) ? payload.error : null;

    if (!entries) {
      return [];
    }

    return Object.entries(entries).map(([key, value]) => {
      if (!isRecord(value)) {
        return `${key}: ${String(value)}`;
      }

      const message = typeof value.message === "string" ? value.message : null;
      const status = typeof value.status === "string" ? value.status : null;

      return [key, message ?? status].filter(Boolean).join(": ");
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
