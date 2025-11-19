import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "../generated-edge/client";

const createPrismaClient = () => {
  // Supabase pooled connection string (must use Supavisor)
  const connectionString = process.env.DATABASE_URL!;
  if (connectionString.includes("@localhost")) {
    // Disable SSL for local connections
    neonConfig.useSecureWebSocket = false;
    // WebSocket proxy is hosted on `4000` locally, so add port. Does not work in production.
    neonConfig.wsProxy = (host) => `${host}:4000/v2`;
  }

  // Only Neon hosts support this -- non-deterministic errors otherwise
  neonConfig.pipelineConnect = false;

  // So it can also work in Node.js
  neonConfig.webSocketConstructor = WebSocket;

  const adapter = new PrismaNeon({ connectionString });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
};

const globalForPrisma = globalThis as unknown as {
  prismaEdge: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prismaEdge ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prismaEdge = db;
