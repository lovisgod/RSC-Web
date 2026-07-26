import { expect, test } from "@playwright/test";

const ADMIN_URL = "http://127.0.0.1:5173";
const OUTLET_URL = "http://127.0.0.1:5175";
const WEB_URL = "http://127.0.0.1:3100";

function envelope(data: unknown) {
  return { data, message: "OK", status: 200 };
}

test("customer sign-in validates credentials before contacting the API", async ({ page }) => {
  let loginRequests = 0;
  await page.route("**/api/v1/auth/login", async (route) => {
    loginRequests += 1;
    await route.abort();
  });

  await page.goto(`${WEB_URL}/sign-in`);
  await page.getByRole("button", { name: "Log In" }).click();

  await expect(page.getByText("Email or phone number is required")).toBeVisible();
  await expect(page.getByText("Password is required")).toBeVisible();
  expect(loginRequests).toBe(0);
});

test("super admin can sign in and reach central operations", async ({ page }) => {
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        envelope({
          user: {
            id: "11111111-1111-4111-8111-111111111111",
            role: "SUPER_ADMIN",
            outletId: null,
          },
          accessTokenExpiresInSeconds: 900,
          refreshTokenExpiresInSeconds: 604800,
        }),
      ),
    }),
  );

  await page.goto(`${ADMIN_URL}/login`);
  await page.getByLabel("Email or phone").fill("admin@example.com");
  await page.locator("input#password").fill("correct-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(`${ADMIN_URL}/`);
  await expect(page.getByText("Platform Live Board", { exact: true }).first()).toBeVisible();
});

test("outlet admin can sign in and reach the active-order queue", async ({ page }) => {
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        envelope({
          user: {
            id: "22222222-2222-4222-8222-222222222222",
            role: "ADMIN",
            outletId: "33333333-3333-4333-8333-333333333333",
          },
          accessTokenExpiresInSeconds: 900,
          refreshTokenExpiresInSeconds: 604800,
        }),
      ),
    }),
  );
  await page.route("**/api/v1/orders/admin?**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        envelope({
          orders: [],
          total: 0,
          totalSubOrders: 0,
          limit: 20,
          offset: 0,
          next: null,
          previous: null,
          hasNext: false,
          hasPrevious: false,
        }),
      ),
    }),
  );

  await page.goto(`${OUTLET_URL}/login`);
  await page.getByLabel("Email or phone").fill("staff@outlet.com");
  await page.locator("input#password").fill("correct-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(`${OUTLET_URL}/`);
  await expect(page.getByText("Incoming", { exact: true })).toBeVisible();
  await expect(page.getByText("No incoming orders")).toBeVisible();
});

test("owner can open the unlisted backup route directly", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "rsc:admin:auth",
      JSON.stringify({
        id: "44444444-4444-4444-8444-444444444444",
        role: "OWNER",
      }),
    );
  });
  await page.route("**/api/v1/system/backups/settings", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        envelope({
          id: "55555555-5555-4555-8555-555555555555",
          isEnabled: true,
          intervalMinutes: 1440,
          recipientEmail: "owner@example.com",
          lastRunAt: null,
          nextRunAt: "2026-07-27T08:00:00.000Z",
          lastStatus: "NEVER_RUN",
          lastError: null,
          lastFileName: null,
          lastFileSizeBytes: null,
          updatedById: null,
          createdAt: "2026-07-26T08:00:00.000Z",
          updatedAt: "2026-07-26T08:00:00.000Z",
        }),
      ),
    }),
  );

  await page.goto(`${ADMIN_URL}/owner/backups`);

  await expect(page).toHaveURL(`${ADMIN_URL}/owner/backups`);
  await expect(page.getByRole("heading", { name: "Database backups" })).toBeVisible();
  await expect(page.getByLabel("Recipient email")).toHaveValue("owner@example.com");
  await expect(page.getByRole("button", { name: "Run backup now" })).toBeVisible();
});
