import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/client";
import { getDatabaseSslConfig } from "./ssl";

export const createTriggerPrisma = () => {
  const connectionString = process.env.DATABASE_URL!;

  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      ssl: getDatabaseSslConfig(connectionString),
    }),
    transactionOptions:
      process.env.NODE_ENV === "development"
        ? undefined
        : {
            maxWait: 7000,
            timeout: 15000,
          },
  });
};
