import type { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Response } from "express";
import type { Observable } from "rxjs";
import { map } from "rxjs";

import { API_MESSAGE_METADATA } from "./api-message.decorator";
import { RAW_RESPONSE_METADATA } from "./raw-response.decorator";

export interface ApiResponse<T> {
  data: T;
  message: string;
  status: number;
}

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T> | T> {
    const isRaw =
      this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_METADATA, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;

    if (isRaw) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse<Response>();
    const message =
      this.reflector.getAllAndOverride<string>(API_MESSAGE_METADATA, [
        context.getHandler(),
        context.getClass(),
      ]) ?? "Request successful";

    return next.handle().pipe(
      map((data) => ({
        data: data ?? ({} as T),
        message,
        status: response.statusCode,
      })),
    );
  }
}
