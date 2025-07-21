import { locals, tasks } from "@trigger.dev/sdk";

import { PrismaClient } from "@agentset/db";

// This would be type of your database client here
const DbLocal = locals.create<PrismaClient>("db");

export function getDb() {
  return locals.getOrThrow(DbLocal);
}

export function setDb(db: PrismaClient) {
  locals.set(DbLocal, db);
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
