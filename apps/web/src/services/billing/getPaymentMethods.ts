/**
 * Get payment methods
 *
 * Returns all payment methods for an organization.
 */

import { AgentsetApiError } from "@/lib/api/errors";

import { stripe } from "@agentset/stripe";

import type { ProtectedAgentsetContext } from "../shared/context";
import { verifyOrganizationAccess } from "../shared/organization-access";

export const getPaymentMethods = async (
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
    const paymentMethods = await stripe.paymentMethods.list({
      customer: organization.stripeId,
    });

    // reorder to put ACH first
    const ach = paymentMethods.data.find(
      (method) => method.type === "us_bank_account",
    );

    return [
      ...(ach ? [ach] : []),
      ...paymentMethods.data.filter((method) => method.id !== ach?.id),
    ];
  } catch (error) {
    console.error(error);
    return [];
  }
};
