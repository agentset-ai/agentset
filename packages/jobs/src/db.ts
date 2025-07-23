import { PrismaClient } from "@agentset/db";

// This would be type of your database client here
const client = new PrismaClient();

export function getDb() {
  return client;
}
