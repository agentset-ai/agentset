import { prismaExtension } from "@trigger.dev/build/extensions/prisma";
import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID!,
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
      // Use the same version as the database package, this is required for the prisma extension to work
      // prismaExtension({
      //   version: "6.12.0",
      //   schema: "../db/prisma/schema/auth.prisma",
      //   migrate: false,
      // }),
      // prismaExtension({
      //   version: "6.12.0",
      //   schema: "../db/prisma/schema/connection.prisma",
      //   migrate: false,
      // }),
      // prismaExtension({
      //   version: "6.12.0",
      //   schema: "../db/prisma/schema/document.prisma",
      //   migrate: false,
      // }),
      // prismaExtension({
      //   version: "6.12.0",
      //   schema: "../db/prisma/schema/ingest-job.prisma",
      //   migrate: false,
      // }),
      // prismaExtension({
      //   version: "6.12.0",
      //   schema: "../db/prisma/schema/namespace.prisma",
      //   migrate: false,
      // }),
      // prismaExtension({
      //   version: "6.12.0",
      //   schema: "../db/prisma/schema/organization.prisma",
      //   migrate: false,
      // }),
      // prismaExtension({
      //   version: "6.12.0",
      //   schema: "../db/prisma/schema/schema.prisma",
      //   migrate: false,
      // }),
      prismaExtension({
        schema: "../../packages/db/prisma/schema/schema.prisma",
        clientGenerator: "client",
      }),
    ],
  },
  dirs: ["./src/tasks"],
});
