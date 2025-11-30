/**
 * Manage billing
 *
 * Creates a Stripe billing portal session for managing billing.
 */

import { AgentsetApiError } from "@/lib/api/errors";
import { getBaseUrl } from "@/lib/utils";

import { stripe } from "@agentset/stripe";

import type { ProtectedAgentsetContext } from "../shared/context";
import { verifyOrganizationAccess } from "../shared/organization-access";

export const manageBilling = async (
  context: ProtectedAgentsetContext,
  input: { orgId: string },
) => {
  const organization = await verifyOrganizationAccess(context, input.orgId);

  if (!organization.stripeId) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: "No Stripe customer ID",
    });
  }

  try {
    const { url } = await stripe.billingPortal.sessions.create({
      customer: organization.stripeId,
      return_url: `${getBaseUrl()}/${organization.slug}/billing`,
    });
    return url;
  } catch (error: any) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: error?.raw?.message,
    });
  }
};
