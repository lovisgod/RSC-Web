import { Injectable, NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import { ObservabilityService } from "./observability.service";

@Injectable()
export class ObservabilityMiddleware implements NestMiddleware {
  constructor(private readonly observability: ObservabilityService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = process.hrtime();

    res.on("finish", () => {
      // Don't record internal metrics scrapes to avoid inflating request count
      if (req.originalUrl?.includes("/observability/metrics")) {
        return;
      }

      const diff = process.hrtime(startTime);
      const durationSeconds = diff[0] + diff[1] / 1e9;
      const rawPath = req.baseUrl ? `${req.baseUrl}${req.path}` : req.originalUrl || req.url;

      this.observability.recordHttpRequest(req.method, rawPath, res.statusCode, durationSeconds);
    });

    next();
  }
}
