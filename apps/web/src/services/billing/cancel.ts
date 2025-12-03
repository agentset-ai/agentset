/**
 * Cancel subscription
 *
 * Creates a Stripe billing portal session for canceling a subscription.
 */

import { AgentsetApiError } from "@/lib/api/errors";
import { getBaseUrl } from "@/lib/utils";

import { stripe } from "@agentset/stripe";

import type { ProtectedAgentsetContext } from "../shared/context";
import { verifyOrganizationAccess } from "../shared/organization-access";

export const cancelSubscription = async (
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
    const activeSubscription = await stripe.subscriptions
      .list({
        customer: organization.stripeId,
        status: "active",
      })
      .then((res) => res.data[0]);

    if (!activeSubscription) {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "No active subscription",
      });
    }

    const { url } = await stripe.billingPortal.sessions.create({
      customer: organization.stripeId,
      return_url: `${getBaseUrl()}/${organization.slug}/billing`,
      flow_data: {
        type: "subscription_cancel",
        subscription_cancel: {
          subscription: activeSubscription.id,
        },
      },
    });
    return url;
  } catch (error: any) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: error.raw.message,
    });
  }
};
