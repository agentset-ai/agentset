import { locals, tasks } from "@trigger.dev/sdk";

import { createClient } from "@agentset/db/node";

type Client = ReturnType<typeof createClient>;

const DbLocal = locals.create<Client>("db");

export function getDb(): Client {
  return locals.getOrThrow(DbLocal);
}

tasks.middleware("db", async ({ next }) => {
  const db = locals.set(DbLocal, createClient());

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
