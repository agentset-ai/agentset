/**
 * Get organization namespaces
 *
 * Returns all active namespaces for an organization that the user is a member of.
 */

import { AgentsetApiError } from "@/lib/api/errors";

import { NamespaceStatus } from "@agentset/db";

import type { ProtectedAgentsetContext } from "../shared/context";

export const getOrgNamespaces = async (
  context: ProtectedAgentsetContext,
  input: { slug: string },
) => {
  // Verify user is a member of the organization
  const member = await context.db.member.findFirst({
    where: {
      userId: context.session.user.id,
      organization: {
        slug: input.slug,
      },
    },
    select: {
      id: true,
      organizationId: true,
    },
  });

  if (!member) {
    throw new AgentsetApiError({
      code: "unauthorized",
      message: "You are not a member of this organization",
    });
  }

  const namespaces = await context.db.namespace.findMany({
    where: {
      organizationId: member.organizationId,
      status: NamespaceStatus.ACTIVE,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return namespaces;
};
