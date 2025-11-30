/**
 * Namespace access verification
 *
 * Shared helper to verify user has access to a namespace.
 * Supports both authenticated (user session) and public API (API key) routes.
 */

import { AgentsetApiError } from "@/lib/api/errors";

import type { AgentsetContext } from "./context";

/**
 * Get and verify namespace access
 *
 * Verifies the user has access to the namespace and returns the namespace object.
 * Throws if namespace not found or user doesn't have access.
 *
 * Supports both ID and slug lookup.
 *
 * SECURITY MODEL:
 * - oRPC routes (protectedProcedure): Always have session via authMiddleware
 *   → Uses toProtectedAgentsetContext() → ProtectedAgentsetContext (session required)
 *   → Always checks user membership
 *
 * - Public API routes (withApiHandler): No user session, authenticated via API key
 *   → Uses createPublicContext() → AgentsetContext (session: null, organizationId set)
 *   → Automatically verifies namespace belongs to context.organizationId
 *   → API key already verified organization access, so we verify namespace ownership
 *
 * @throws {AgentsetApiError} If namespace not found or user doesn't have access
 * @returns The namespace object if access is granted
 */
export const getNamespace = async (
  context: AgentsetContext,
  idOrSlug:
    | {
        id: string;
      }
    | {
        slug: string;
      },
) => {
  const namespace = await context.db.namespace.findFirst({
    where: {
      ...("id" in idOrSlug ? { id: idOrSlug.id } : { slug: idOrSlug.slug }),
      // Only check user membership if session exists (authenticated routes)
      // Public API routes use API key auth, so skip membership check
      // NOTE: oRPC routes using protectedProcedure will always have session
      // due to authMiddleware, so this check is always enforced for them
      ...(context.session
        ? {
            organization: {
              members: { some: { userId: context.session.user.id } },
            },
          }
        : context.organizationId
          ? {
              organizationId: context.organizationId,
            }
          : {}),
    },
  });

  if (!namespace) {
    throw new AgentsetApiError({
      code: "not_found",
      message: "Namespace not found or you don't have access to it",
    });
  }

  return namespace;
};
