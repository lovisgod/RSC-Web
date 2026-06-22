import type { Server } from "node:http";

import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppController } from "../src/app.controller";
import { configureApplication } from "../src/bootstrap";
import { RequestIdMiddleware } from "../src/common/middleware/request-id.middleware";

describe("API bootstrap", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const values: Record<string, unknown> = {
                app: {
                  corsOrigins: ["http://localhost:3000"],
                  swaggerEnabled: false,
                  version: "test-sha",
                },
                "app.version": "test-sha",
                "app.environment": "test",
              };

              return values[key];
            },
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    const requestIdMiddleware = new RequestIdMiddleware();
    app.use(requestIdMiddleware.use);
    configureApplication(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("serves versioned metadata and a request ID", async () => {
    const server = app.getHttpServer() as Server;
    const response = await request(server).get("/api/v1").expect(200);
    const responseBody: unknown = response.body;

    expect(response.headers["x-request-id"]).toBeTypeOf("string");
    expect(responseBody).toEqual({
      service: "rsc-api",
      version: "test-sha",
      environment: "test",
    });
  });
});
