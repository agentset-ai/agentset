import { prismaExtension } from "@trigger.dev/build/extensions/prisma";
import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_heylmfrjrdnzckcthrjb",
  runtime: "node",
  logLevel: "log",
  maxDuration: 3600,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  build: {
    extensions: [
      prismaExtension({
        // Use the same version as the database package, this is required for the prisma extension to work
        version: "6.7.0",
        schema: "../../packages/db/prisma/schema/schema.prisma",
      }),
    ],
  },
  dirs: ["./src/tasks"],
});
