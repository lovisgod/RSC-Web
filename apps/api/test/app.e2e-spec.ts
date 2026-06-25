import type { Server } from "node:http";

import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppController } from "../src/app.controller";
import { AuthController } from "../src/auth/auth.controller";
import { AuthService } from "../src/auth/auth.service";
import { configureApplication } from "../src/bootstrap";
import { RequestIdMiddleware } from "../src/common/middleware/request-id.middleware";

describe("API bootstrap", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AppController, AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: () => undefined,
            verifyUser: () => undefined,
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const values: Record<string, unknown> = {
                app: {
                  corsOrigins: ["http://localhost:3000"],
                  swaggerEnabled: true,
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
      data: {
        service: "rsc-api",
        version: "test-sha",
        environment: "test",
      },
      message: "API metadata retrieved",
      status: 200,
    });
  });

  it("serves Swagger UI and a valid OpenAPI document", async () => {
    const server = app.getHttpServer() as Server;

    await request(server).get("/api/docs").expect(200).expect("content-type", /html/);

    const response = await request(server).get("/api/openapi.json").expect(200);
    const document = response.body as {
      info?: { title?: unknown; version?: unknown };
      openapi?: unknown;
      paths?: Record<string, unknown>;
    };

    expect(document.info).toMatchObject({ title: "RSC Platform API", version: "test-sha" });
    expect(document.openapi).toMatch(/^3\./);
    expect(document.paths?.["/api/v1"]).toBeTypeOf("object");
    expect(document.paths?.["/api/v1/auth/register"]).toBeTypeOf("object");
    expect(document.paths?.["/api/v1/auth/verify-user"]).toBeTypeOf("object");
  });

  it("uses the standard response envelope for errors", async () => {
    const server = app.getHttpServer() as Server;
    const response = await request(server).get("/api/v1/not-found").expect(404);
    const body = response.body as {
      data?: { errors?: unknown; path?: unknown; requestId?: unknown; timestamp?: unknown };
      message?: unknown;
      status?: unknown;
    };

    expect(body.data?.errors).toEqual(["Cannot GET /api/v1/not-found"]);
    expect(body.data?.path).toBe("/api/v1/not-found");
    expect(body.data?.requestId).toBeTypeOf("string");
    expect(body.data?.timestamp).toBeTypeOf("string");
    expect(body.message).toBe("Cannot GET /api/v1/not-found");
    expect(body.status).toBe(404);
  });
});
