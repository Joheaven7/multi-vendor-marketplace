import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globalSetup: ["./src/tests/global-setup.ts"],
    setupFiles: ["./src/tests/setup.ts"],
    // All test files share one in-memory database, so run them one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    env: {
      NODE_ENV: "test",
      // Placeholder only. Tests connect to the in-memory database, never to this value.
      MONGODB_URI: "mongodb://placeholder.invalid/unused",
      CLIENT_URL: "http://localhost:3000",
      JWT_ACCESS_SECRET: "test-access-secret-test-access-secret-0001",
      JWT_REFRESH_SECRET: "test-refresh-secret-test-refresh-secret-0002",
      JWT_ACCESS_EXPIRES: "15m",
      JWT_REFRESH_EXPIRES: "7d",
      // Blank on purpose: stops .env from giving tests access to your real Cloudinary account.
      CLOUDINARY_CLOUD_NAME: "",
      CLOUDINARY_API_KEY: "",
      CLOUDINARY_API_SECRET: "",
    },
  },
});