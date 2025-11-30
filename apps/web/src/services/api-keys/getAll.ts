/**
 * Get all API keys for an organization
 *
 * Returns all API keys for an organization (admin/owner only).
 * The actual key values are omitted for security.
 */

import { AgentsetApiError } from "@/lib/api/errors";

import type { ProtectedAgentsetContext } from "../shared/context";

export const getAllApiKeys = async (
  context: ProtectedAgentsetContext,
  input: { orgId: string },
) => {
  // make sure the user is a member of the org
  const member = await context.db.member.findFirst({
    where: {
      userId: context.session.user.id,
      organizationId: input.orgId,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!member || (member.role !== "admin" && member.role !== "owner")) {
    throw new AgentsetApiError({
      code: "unauthorized",
      message: "You must be an admin or owner to view API keys",
    });
  }

  const apiKeys = await context.db.organizationApiKey.findMany({
    where: {
      organizationId: input.orgId,
    },
    omit: {
      key: true,
    },
  });

  return apiKeys;
};
