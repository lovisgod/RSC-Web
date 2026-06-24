import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "./index";

describe("registration API client", () => {
  it("posts the typed registration shape to the versioned API", async () => {
    const requestFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
          status: "UNVERIFIED",
          otpExpiresInSeconds: 600,
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
    });

    expect(requestFetch).toHaveBeenCalledWith(
      "https://api-dev.rscapp.xyz/api/v1/auth/register",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Ada Okafor",
          phone: "08031234567",
          email: "ada@example.com",
        }),
      }),
    );
  });
});
