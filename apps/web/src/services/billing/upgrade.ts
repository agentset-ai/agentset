/**
 * Upgrade plan
 *
 * Creates a Stripe checkout session or billing portal session for upgrading.
 */

import { AgentsetApiError } from "@/lib/api/errors";
import { getBaseUrl } from "@/lib/utils";

import { stripe } from "@agentset/stripe";
import {
  getStripeEnvironment,
  isProPlan,
  PRO_PLAN_METERED,
} from "@agentset/stripe/plans";

import type { ProtectedAgentsetContext } from "../shared/context";
import { verifyOrganizationAccess } from "../shared/organization-access";

export const upgradePlan = async (
  context: ProtectedAgentsetContext,
  input: {
    orgId: string;
    plan: "free" | "pro";
    period: "monthly" | "yearly";
    baseUrl: string;
  },
) => {
  const organization = await verifyOrganizationAccess(context, input.orgId);
  const { plan, period, baseUrl } = input;

  const planKey = plan.replace(" ", "+");
  const prices = await stripe.prices.list({
    lookup_keys: [`${planKey}_${period}`],
  });
  const priceId = prices.data[0]!.id;

  const activeSubscription = organization.stripeId
    ? await stripe.subscriptions
        .list({
          customer: organization.stripeId,
          status: "active",
        })
        .then((res) => res.data[0])
    : null;

  // if the user has an active subscription, create billing portal to upgrade
  if (organization.stripeId && activeSubscription) {
    const { url } = await stripe.billingPortal.sessions.create({
      customer: organization.stripeId,
      return_url: baseUrl,
      flow_data: {
        type: "subscription_update",
        subscription_update: {
          subscription: activeSubscription.id,
        },
      },
    });

    return { url };
  } else {
    // For both new users and users with canceled subscriptions
    const stripeSession = await stripe.checkout.sessions.create({
      ...(organization.stripeId
        ? {
            customer: organization.stripeId,
            // need to pass this or Stripe will throw an error: https://git.new/kX4fi6B
            customer_update: {
              name: "auto",
              address: "auto",
            },
          }
        : {
            customer_email: context.session.user.email,
          }),
      billing_address_collection: "required",
      success_url: `${getBaseUrl()}/${organization.slug}?upgraded=true&plan=${planKey}&period=${period}`,
      cancel_url: baseUrl,
      line_items: [
        { price: priceId, quantity: 1 },
        ...(isProPlan(plan)
          ? [
              {
                price: PRO_PLAN_METERED[period].priceId[getStripeEnvironment()],
              },
            ]
          : []),
      ],
      allow_promotion_codes: true,
      automatic_tax: {
        enabled: true,
      },
      tax_id_collection: {
        enabled: true,
      },
      mode: "subscription",
      client_reference_id: organization.id,
      metadata: {
        agentsetCustomerId: context.session.user.id,
      },
    });

    return { sessionId: stripeSession.id };
  }
};
