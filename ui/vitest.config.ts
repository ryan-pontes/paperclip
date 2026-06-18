import path from "path";
import { defineConfig } from "vitest/config";

// Retry flaky UI component tests in CI only (same rationale as server/vitest.config.ts).
const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
const retry = process.env.VITEST_RETRY
  ? Number.parseInt(process.env.VITEST_RETRY, 10)
  : isCI
    ? 2
    : 0;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      lexical: path.resolve(__dirname, "./node_modules/lexical/Lexical.mjs"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    retry: Number.isNaN(retry) ? 0 : retry,
  },
});
