/**
 * Create public context for services
 *
 * Utility function to create an AgentsetContext for public API routes
 * that authenticate via API key rather than user session.
 */

import { db } from "@agentset/db/client";

import type { AgentsetContext } from "./context";

/**
 * Create a public context for services used in public API routes
 *
 * Public API routes authenticate via API key, so they don't have a user session.
 * This utility creates a context with null session for use with services that
 * support optional session.
 *
 * @param headers - Request headers (typically from NextRequest)
 * @param organizationId - Organization ID from API key (optional, for namespace verification)
 * @returns AgentsetContext with null session
 */
export const createPublicContext = (
  headers: Headers,
  organizationId?: string,
): AgentsetContext => {
  return {
    db,
    session: null,
    headers,
    organizationId,
  };
};
