import type Stripe from "stripe";

import { Prisma } from "@agentset/db";
import { INFINITY_NUMBER } from "@agentset/utils";

import { stripe } from "./instance";
import { isLiveSubscription } from "./period";
import { PLANS } from "./plans";

export async function cancelSubscription(customer?: string) {
  if (!customer) return;

  try {
    const subscriptionId = await stripe.subscriptions
      .list({
        customer,
      })
      .then((res) => res.data[0]?.id);

    if (subscriptionId) {
      return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
        cancellation_details: {
          comment: "Customer deleted their Agentset organization.",
        },
      });
    }
  } catch (error) {
    console.log("Error cancelling Stripe subscription", error);
    return;
  }
}

export const planToOrganizationFields = (plan: (typeof PLANS)[number]) => {
  return {
    plan: plan.name.toLowerCase(),
    pagesLimit: plan.limits.pages,
    searchLimit: plan.limits.retrievals,
    apiRatelimit: plan.limits.api,
    // TODO: add other limits
  } satisfies Prisma.OrganizationUpdateInput;
};

export const parseEnterprisePlanMetadata = async (
  items: Stripe.SubscriptionItem[],
) => {
  // get metadata from product
  const productIds = [
    ...new Set(
      items.map((item) =>
        typeof item.price.product === "string"
          ? item.price.product
          : item.price.product.id,
      ),
    ),
  ];

  if (productIds.length === 0) return null;

  const products = await stripe.products.list({ ids: productIds });
  const metadata = products.data.find(
    (product) => product.metadata?.plan === "enterprise",
  )?.metadata;

  if (!metadata) return null;

  const apiRatelimit = Number(metadata.apiRatelimit);
  const pagesLimit = Number(metadata.pagesLimit);
  const searchLimit =
    metadata.searchLimit === "infinity"
      ? INFINITY_NUMBER
      : Number(metadata.searchLimit);

  if (isNaN(apiRatelimit) || isNaN(pagesLimit) || isNaN(searchLimit)) {
    return null;
  }

  return {
    plan: "enterprise",
    apiRatelimit,
    pagesLimit,
    searchLimit,
  } satisfies Prisma.OrganizationUpdateInput;
};

/**
 * The customer's subscription that currently bills them, newest first when
 * there are several.
 */
export async function getLiveSubscription(customer: string) {
  const { data } = await stripe.subscriptions.list({
    customer,
    status: "all",
    limit: 10,
  });

  return (
    data.filter(isLiveSubscription).sort((a, b) => b.created - a.created)[0] ??
    null
  );
}

/**
 * Whether an invoice that starts the subscription's period was paid before
 * `paidBefore`. These are the invoices that made the previous implementation
 * re-meter existing documents.
 */
export async function isPeriodInvoicePaid({
  subscription,
  periodStart,
  paidBefore,
}: {
  subscription: string;
  periodStart: Date;
  paidBefore: Date;
}) {
  const { data } = await stripe.invoices.list({
    subscription,
    status: "paid",
    created: { gte: Math.floor(periodStart.getTime() / 1000) - 60 },
    limit: 10,
  });

  return data.some(
    (invoice) =>
      (invoice.billing_reason === "subscription_cycle" ||
        invoice.billing_reason === "subscription_create") &&
      !!invoice.status_transitions.paid_at &&
      invoice.status_transitions.paid_at * 1000 < paidBefore.getTime(),
  );
}
