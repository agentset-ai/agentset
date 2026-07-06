import { db } from "@agentset/db/client";

export const getOrganizationMembers = async ({
  organizationId,
  userId,
}: {
  organizationId: string;
  // when provided, only returns results if the user is a member of the organization
  userId?: string;
}) => {
  return await db.organization.findUnique({
    where: {
      id: organizationId,
      ...(userId && {
        members: {
          some: {
            userId,
          },
        },
      }),
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
};
