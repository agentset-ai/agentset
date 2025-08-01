import { locals, tasks } from "@trigger.dev/sdk";

import { PrismaClient } from "@agentset/db";

// This would be type of your database client here
const DbLocal = locals.create<PrismaClient>("db");

export function getDb(): PrismaClient {
  return locals.getOrThrow(DbLocal);
}

tasks.middleware("db", async ({ next }) => {
  // This would be your database client here
  const db = locals.set(DbLocal, new PrismaClient());

  await db.$connect();
  await next();
  await db.$disconnect();
});

// Disconnect when the run is paused
tasks.onWait("db", async () => {
  const db = getDb();
  await db.$disconnect();
});

// Reconnect when the run is resumed
tasks.onResume("db", async () => {
  const db = getDb();
  await db.$connect();
});
