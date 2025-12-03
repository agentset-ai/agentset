/**
 * Get organization by slug
 *
 * Returns organization details including member role information.
 */

import { AgentsetApiError } from "@/lib/api/errors";

import type { ProtectedAgentsetContext } from "../shared/context";

export const getOrganizationBySlug = async (
  context: ProtectedAgentsetContext,
  input: { slug: string },
) => {
  const org = await context.db.organization.findUnique({
    where: {
      slug: input.slug,
      members: {
        some: {
          userId: context.session.user.id,
        },
      },
    },
    include: {
      members: {
        where: {
          userId: context.session.user.id,
        },
        take: 1,
        select: {
          id: true,
          role: true,
        },
      },
    },
  });

  if (!org) {
    throw new AgentsetApiError({
      code: "not_found",
      message: "Organization not found",
    });
  }

  const { members } = org;
  const isAdmin = members[0]?.role === "admin" || members[0]?.role === "owner";

  return {
    ...org,
    isAdmin,
    isOwner: members[0]?.role === "owner",
    currentMemberId: members[0]?.id,
  };
};
