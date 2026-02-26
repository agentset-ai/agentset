import { NextResponse } from "next/server";
import { log } from "@/lib/log";

import type { Stripe } from "@agentset/stripe";
import { db } from "@agentset/db/client";
import { planToOrganizationFields, stripe } from "@agentset/stripe";
import { FREE_PLAN } from "@agentset/stripe/plans";
import { webhookCache } from "@agentset/webhooks/server";

import {
  revalidateOrganizationCache,
  sendCancellationFeedback,
  updateOrganizationPlan,
} from "./utils";

export async function customerSubscriptionDeleted(event: Stripe.Event) {
  const subscriptionDeleted = event.data.object as Stripe.Subscription;

  const stripeId =
    typeof subscriptionDeleted.customer === "string"
      ? subscriptionDeleted.customer
      : subscriptionDeleted.customer.id;

  // If a organization deletes their subscription, reset their usage limit in the database to the free plan limits.
  const organization = await db.organization.findUnique({
    where: {
      stripeId,
    },
    select: {
      id: true,
      slug: true,
      plan: true,
      paymentFailedAt: true,
      members: {
        select: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        where: {
          OR: [{ role: "owner" }, { role: "admin" }],
        },
      },
    },
  });

  if (!organization) {
    console.log(
      "Organization with Stripe ID *`" +
        stripeId +
        "`* not found in Stripe webhook `customer.subscription.deleted` callback",
    );
    return NextResponse.json({ received: true });
  }

  // Check if the customer has another active subscription
  const { data: activeSubscriptions } = await stripe.subscriptions.list({
    customer: stripeId,
    status: "active",
  });

  if (activeSubscriptions.length > 0) {
    const activeSubscription = activeSubscriptions[0]!;

    await updateOrganizationPlan({
      event: "customer.subscription.deleted",
      organization,
      items: activeSubscription.items.data,
    });

    return NextResponse.json({ received: true });
  }

  revalidateOrganizationCache(organization.id);

  await Promise.allSettled([
    db.organization.update({
      where: {
        id: organization.id,
      },
      data: {
        ...planToOrganizationFields(FREE_PLAN),
        paymentFailedAt: null,
        webhookEnabled: false,
      },
    }),
    // Disable the webhooks
    db.webhook.updateMany({
      where: {
        organizationId: organization.id,
      },
      data: {
        disabledAt: new Date(),
      },
    }),
    webhookCache.invalidateOrg(organization.id),
    log({
      message:
        ":cry: Organization *`" +
        organization.slug +
        "`* deleted their subscription",
      type: "cron",
    }),
    sendCancellationFeedback({
      owners: organization.members.map(({ user }) => user),
    }),
  ]);
}
