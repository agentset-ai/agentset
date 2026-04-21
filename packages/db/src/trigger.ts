import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/client";

export const createTriggerPrisma = () => {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
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
