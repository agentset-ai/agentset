/**
 * Delete organization
 *
 * Marks an organization for deletion, cancels subscription, and triggers deletion job.
 * Verifies user has admin/owner role.
 */

import { AgentsetApiError } from "@/lib/api/errors";

import { OrganizationStatus } from "@agentset/db";
import { triggerDeleteOrganization } from "@agentset/jobs";
import { cancelSubscription } from "@agentset/stripe";

import type { ProtectedAgentsetContext } from "../shared/context";

export const deleteOrganization = async (
  context: ProtectedAgentsetContext,
  input: { organizationId: string },
) => {
  const org = await context.db.organization.findUnique({
    where: {
      id: input.organizationId,
      members: {
        some: {
          userId: context.session.user.id,
          role: { in: ["admin", "owner"] },
        },
      },
    },
  });

  if (!org) {
    throw new AgentsetApiError({
      code: "unauthorized",
      message: "You are not authorized to delete this organization",
    });
  }

  if (org.status === OrganizationStatus.DELETING) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: "Organization is already being deleted",
    });
  }

  const updatedOrg = await context.db.organization.update({
    where: {
      id: org.id,
    },
    data: {
      status: OrganizationStatus.DELETING,
    },
    select: {
      id: true,
      stripeId: true,
      namespaces: {
        select: {
          id: true,
        },
      },
    },
  });

  if (updatedOrg.stripeId) {
    await cancelSubscription(updatedOrg.stripeId);
  }

  await triggerDeleteOrganization({
    organizationId: updatedOrg.id,
  });
};
