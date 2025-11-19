import { locals, tasks } from "@trigger.dev/sdk";

import { createTriggerPrisma } from "@agentset/db/trigger";

type Db = ReturnType<typeof createTriggerPrisma>;
const DbLocal = locals.create<Db>("db");

export function getDb(): Db {
  return locals.getOrThrow(DbLocal);
}

tasks.middleware("db", async ({ next }) => {
  const db = locals.set(DbLocal, createTriggerPrisma());

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
