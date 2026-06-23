import { randomUUID } from "node:crypto";

import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use = (request: Request, response: Response, next: NextFunction): void => {
    const requestId = request.header("x-request-id")?.trim() || randomUUID();

    response.setHeader("x-request-id", requestId);
    next();
  };
}
