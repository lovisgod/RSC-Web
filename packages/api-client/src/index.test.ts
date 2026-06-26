import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "./index";

describe("registration API client", () => {
  const menuItem = {
    id: "45ef3252-b96f-4308-b40e-391623b25ac9",
    outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
    categoryId: "35df7fe2-f6cd-483e-a0a2-b2331c4f4fb9",
    name: "Jollof Rice",
    description: null,
    imageUrl: null,
    priceMinor: 450000,
    currency: "NGN",
    isAvailable: true,
    sortOrder: 0,
    createdAt: "2026-06-23T10:00:00.000Z",
    updatedAt: "2026-06-23T10:00:00.000Z",
    deletedAt: null,
  };

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

  it("posts outlet admin creation to the versioned API", async () => {
    const requestFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: "b709c9f9-7d01-4d84-90d6-50b0ad470bc5",
            name: "Outlet Manager",
            role: "ADMIN",
            outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
            temporaryPassword: "e9FPuxWz3zRaAa1!",
          },
          message: "Admin created successfully",
          status: 201,
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      ),
    );
    const client = createApiClient({
      baseUrl: "https://api-dev.rscapp.xyz/",
      fetch: requestFetch,
    });

    await client.createAdmin({
      name: "Outlet Manager",
      email: "MANAGER@EXAMPLE.COM",
      phone: "08031234567",
      outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
    });

    expect(requestFetch).toHaveBeenCalledWith(
      "https://api-dev.rscapp.xyz/api/v1/auth/admins",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Outlet Manager",
          email: "manager@example.com",
          phone: "08031234567",
          outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
        }),
      }),
    );
  });

  it("lists menu items for an outlet", async () => {
    const requestFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [menuItem],
          message: "Menu items retrieved",
          status: 200,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const client = createApiClient({
      baseUrl: "https://api-dev.rscapp.xyz/",
      fetch: requestFetch,
    });

    await client.listMenuItems({ outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0" });

    expect(requestFetch).toHaveBeenCalledWith(
      "https://api-dev.rscapp.xyz/api/v1/menu-items?outletId=4273e96c-2887-49a5-a6d5-269f007f04f0",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("patches menu item availability to the real-time toggle endpoint", async () => {
    const requestFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { ...menuItem, isAvailable: false },
          message: "Menu item availability updated successfully",
          status: 200,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const client = createApiClient({
      baseUrl: "https://api-dev.rscapp.xyz/",
      fetch: requestFetch,
    });

    await client.updateMenuItemAvailability("45ef3252-b96f-4308-b40e-391623b25ac9", {
      isAvailable: false,
    });

    expect(requestFetch).toHaveBeenCalledWith(
      "https://api-dev.rscapp.xyz/api/v1/menu-items/45ef3252-b96f-4308-b40e-391623b25ac9/availability",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ isAvailable: false }),
      }),
    );
  });
});
