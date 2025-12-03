/**
 * Get namespace by slug
 *
 * Returns a namespace by its slug, verifying the user has access.
 */

import { NamespaceStatus } from "@agentset/db";

import type { ProtectedAgentsetContext } from "../shared/context";

export const getNamespaceBySlug = async (
  context: ProtectedAgentsetContext,
  input: { orgSlug: string; slug: string },
) => {
  const namespace = await context.db.namespace.findFirst({
    where: {
      slug: input.slug,
      organization: {
        slug: input.orgSlug,
        members: { some: { userId: context.session.user.id } },
      },
      status: NamespaceStatus.ACTIVE,
    },
  });

  return namespace;
};
