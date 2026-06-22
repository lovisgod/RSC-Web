import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";

import { AppController } from "./app.controller";

describe("AppController", () => {
  it("returns service metadata", async () => {
    const module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === "app.version" ? "test-sha" : "test",
          },
        },
      ],
    }).compile();

    expect(module.get(AppController).info()).toEqual({
      service: "rsc-api",
      version: "test-sha",
      environment: "test",
    });
  });
});
