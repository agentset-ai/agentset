/**
 * Get organization members
 *
 * Returns all members and pending invitations for an organization.
 */

import type { ProtectedAgentsetContext } from "../shared/context";

export const getOrganizationMembers = async (
  context: ProtectedAgentsetContext,
  input: { organizationId: string },
) => {
  const members = await context.db.organization.findUnique({
    where: {
      id: input.organizationId,
      members: {
        some: {
          userId: context.session.user.id,
        },
      },
    },
    select: {
      members: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      invitations: {
        where: {
          status: "pending",
        },
      },
    },
  });

  return members;
};
