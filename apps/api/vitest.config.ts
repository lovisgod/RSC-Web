import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      include: [
        "src/**/*.service.ts",
        "src/**/*.guard.ts",
        "src/**/*.adapter.ts",
        "src/**/*.sender.ts",
        "src/**/*.filter.ts",
        "src/**/*.interceptor.ts",
      ],
      exclude: ["src/**/*.module.ts", "src/**/*.spec.ts"],
      thresholds: {
        statements: 47,
        branches: 38,
        functions: 51,
        lines: 47,
        "src/orders/orders.service.ts": {
          statements: 69,
          branches: 61,
          functions: 83,
          lines: 68,
        },
        "src/payments/payments.service.ts": {
          statements: 71,
          branches: 53,
          functions: 76,
          lines: 71,
        },
      },
    },
  },
});
