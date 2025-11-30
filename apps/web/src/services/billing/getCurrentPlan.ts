/**
 * Get current plan
 *
 * Returns the current plan and usage information for an organization.
 */

import type { ProtectedAgentsetContext } from "../shared/context";
import { verifyOrganizationAccess } from "../shared/organization-access";

export const getCurrentPlan = async (
  context: ProtectedAgentsetContext,
  input: { orgId: string },
) => {
  await verifyOrganizationAccess(context, input.orgId);

  const org = await context.db.organization.findUnique({
    where: {
      id: input.orgId,
    },
    select: {
      plan: true,
      pagesLimit: true,
      totalPages: true,
      totalDocuments: true,
      totalIngestJobs: true,
      totalNamespaces: true,
      billingCycleStart: true,
      stripeId: true,
    },
  });

  if (!org) {
    throw new Error("Organization not found");
  }

  return org;
};
