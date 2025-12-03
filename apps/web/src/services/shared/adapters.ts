/**
 * Context adapters
 *
 * Convert framework-specific contexts to AgentsetContext.
 * This allows services to work with any framework.
 */

import type { ORPCContext, ProtectedORPCContext } from "@/server/orpc/orpc";

import type { AgentsetContext, ProtectedAgentsetContext } from "./context";

/**
 * Convert oRPC context to AgentsetContext (supports optional session for public routes)
 */
export const toAgentsetContext = (ctx: ORPCContext): AgentsetContext => {
  return {
    db: ctx.db,
    session: ctx.session,
    headers: ctx.headers,
  };
};

/**
 * Convert protected oRPC context to ProtectedAgentsetContext
 */
export const toProtectedAgentsetContext = (
  ctx: ProtectedORPCContext,
): ProtectedAgentsetContext => {
  return {
    db: ctx.db,
    session: ctx.session,
    headers: ctx.headers,
  };
};
