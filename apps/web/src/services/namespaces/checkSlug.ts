/**
 * Check if namespace slug is available
 *
 * Returns true if the slug is already taken, false if available.
 */

import type { ProtectedAgentsetContext } from "../shared/context";

export const checkSlug = async (
  context: ProtectedAgentsetContext,
  input: { orgId: string; slug: string },
) => {
  const namespace = await context.db.namespace.findUnique({
    where: {
      organizationId_slug: {
        slug: input.slug,
        organizationId: input.orgId,
      },
    },
  });

  return !!namespace;
};
