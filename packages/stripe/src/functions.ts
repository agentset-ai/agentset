import type Stripe from "stripe";

import { Prisma } from "@agentset/db";
import { INFINITY_NUMBER } from "@agentset/utils";

import { stripe } from "./instance";
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
