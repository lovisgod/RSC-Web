import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/integration/**/*.integration-spec.ts"],
    setupFiles: ["test/integration/setup-env.ts"],
    globalSetup: ["test/integration/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
