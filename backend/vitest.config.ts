import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    globalTeardown: ["./tests/globalTeardown.ts"],
    clearMocks: true,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Prisma query engine is unstable under multi-worker parallel file runs on Windows.
    fileParallelism: false,
    maxWorkers: 1,
  },
});
