/**
 * Agentset context types
 *
 * Framework-agnostic context types for services.
 * Framework-specific contexts should be converted to these types.
 */

import type { auth } from "@/lib/auth";

import type { db } from "@agentset/db";

export type AgentsetContext = {
  db: typeof db;
  session: Awaited<ReturnType<typeof auth.api.getSession>>;
  headers: Headers;
};

export type ProtectedAgentsetContext = AgentsetContext & {
  session: NonNullable<AgentsetContext["session"]>;
};
