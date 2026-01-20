import { defineConfig } from "vitest/config";
import path from "path";
import { config } from "dotenv";

// Load test environment variables
config({ path: path.resolve(__dirname, "test/.env.test.local") });

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    globals: true,
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
