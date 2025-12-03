/**
 * Get all organizations for a user
 *
 * Returns all active organizations that the user is a member of.
 */

import { OrganizationStatus } from "@agentset/db";

import type { ProtectedAgentsetContext } from "../shared/context";

export const getAllOrganizations = async (
  context: ProtectedAgentsetContext,
) => {
  const orgs = await context.db.organization.findMany({
    where: {
      members: {
        some: {
          userId: context.session.user.id,
        },
      },
      status: OrganizationStatus.ACTIVE,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      logo: true,
      namespaces: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return orgs;
};
