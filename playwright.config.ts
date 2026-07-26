import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "pnpm --filter @rsc/web exec next dev --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100/sign-in",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "pnpm --filter @rsc/admin exec vite --host 127.0.0.1 --port 5173",
      url: "http://127.0.0.1:5173/login",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "pnpm --filter @rsc/outlet-admin exec vite --host 127.0.0.1 --port 5175",
      url: "http://127.0.0.1:5175/login",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
