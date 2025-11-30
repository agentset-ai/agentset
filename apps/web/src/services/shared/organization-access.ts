/**
 * Verify organization access
 *
 * Verifies that the user is a member of the organization and returns the organization.
 */

import { AgentsetApiError } from "@/lib/api/errors";

import type { ProtectedAgentsetContext } from "./context";

export const verifyOrganizationAccess = async (
  context: ProtectedAgentsetContext,
  orgId: string,
) => {
  const organization = await context.db.organization.findUnique({
    where: {
      id: orgId,
      members: { some: { userId: context.session.user.id } },
    },
    select: {
      id: true,
      slug: true,
      stripeId: true,
    },
  });

  if (!organization) {
    throw new AgentsetApiError({
      code: "not_found",
      message: "Organization not found",
    });
  }

  return organization;
};
