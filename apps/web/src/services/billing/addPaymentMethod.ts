/**
 * Add payment method
 *
 * Creates a Stripe checkout session or billing portal session for adding a payment method.
 */

import { AgentsetApiError } from "@/lib/api/errors";
import { getBaseUrl } from "@/lib/utils";

import { stripe } from "@agentset/stripe";

import type { ProtectedAgentsetContext } from "../shared/context";
import { verifyOrganizationAccess } from "../shared/organization-access";

export const addPaymentMethod = async (
  context: ProtectedAgentsetContext,
  input: {
    orgId: string;
    method?: "card" | "us_bank_account";
  },
) => {
  const organization = await verifyOrganizationAccess(context, input.orgId);

  if (!organization.stripeId) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: "No Stripe customer ID",
    });
  }

  if (!input.method) {
    const { url } = await stripe.billingPortal.sessions.create({
      customer: organization.stripeId,
      return_url: `${getBaseUrl()}/${organization.slug}/billing`,
      flow_data: {
        type: "payment_method_update",
      },
    });

    return url;
  }

  const { url } = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: organization.stripeId,
    payment_method_types: [input.method],
    success_url: `${getBaseUrl()}/${organization.slug}/billing`,
    cancel_url: `${getBaseUrl()}/${organization.slug}/billing`,
  });

  return url;
};
