import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "./index";

describe("registration API client", () => {
  it("posts the typed registration shape to the versioned API", async () => {
    const requestFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
            status: "UNVERIFIED",
            otpExpiresInSeconds: 600,
            verificationChannels: { email: false, phone: false },
          },
          message: "Customer registered; verification codes sent",
          status: 201,
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      ),
    );
    const client = createApiClient({
      baseUrl: "https://api-dev.rscapp.xyz/",
      fetch: requestFetch,
    });

    await client.registerCustomer({
      name: "Ada Okafor",
      phone: "08031234567",
      email: "ADA@EXAMPLE.COM",
      password: "SecureP@ss1",
    });

    expect(requestFetch).toHaveBeenCalledWith(
      "https://api-dev.rscapp.xyz/api/v1/auth/register",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Ada Okafor",
          phone: "08031234567",
          email: "ada@example.com",
          password: "SecureP@ss1",
        }),
      }),
    );
  });

  it("posts user verification to the versioned API", async () => {
    const requestFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
            status: "ACTIVE",
            channel: "email",
            verifiedAt: "2026-06-23T10:00:00.000Z",
            verificationChannels: { email: true, phone: false },
          },
          message: "User verified successfully",
          status: 200,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const client = createApiClient({
      baseUrl: "https://api-dev.rscapp.xyz/",
      fetch: requestFetch,
    });

    await client.verifyUser({
      channel: "email",
      email: "ADA@EXAMPLE.COM",
      code: "193847",
    });

    expect(requestFetch).toHaveBeenCalledWith(
      "https://api-dev.rscapp.xyz/api/v1/auth/verify-user",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          channel: "email",
          email: "ada@example.com",
          code: "193847",
        }),
      }),
    );
  });

  it("posts login credentials to the versioned API", async () => {
    const requestFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            user: {
              id: "2abf9577-027c-4936-83a8-e004fd56a46e",
              role: "CUSTOMER",
            },
            accessTokenExpiresInSeconds: 900,
            refreshTokenExpiresInSeconds: 604800,
          },
          message: "Login successful",
          status: 200,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const client = createApiClient({
      baseUrl: "https://api-dev.rscapp.xyz/",
      fetch: requestFetch,
    });

    await client.login({
      identifier: "ADA@EXAMPLE.COM",
      password: "SecureP@ss1",
    });

    expect(requestFetch).toHaveBeenCalledWith(
      "https://api-dev.rscapp.xyz/api/v1/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          identifier: "ada@example.com",
          password: "SecureP@ss1",
        }),
      }),
    );
  });
});
