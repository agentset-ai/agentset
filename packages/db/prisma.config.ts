import { defineConfig, env } from "prisma/config";

export default defineConfig({
  datasource: {
    // this file is used by the prisma cli, so we pass DIRECT_URL
    // but when creating the prisma client, we use DATABASE_URL
    url:
      process.env.PRISMA_MODE === "generate"
        ? env("DATABASE_URL")
        : env("DIRECT_URL"),
  },
  migrations: {
    path: "prisma/migrations",
  },
  schema: "prisma/schema",
});
