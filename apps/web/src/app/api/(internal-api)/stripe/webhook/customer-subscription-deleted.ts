import { NextResponse } from "next/server";
import { log } from "@/lib/log";

import type { Stripe } from "@agentset/stripe";
import { db } from "@agentset/db/client";
import { FREE_PLAN, planToOrganizationFields } from "@agentset/stripe/plans";

import { revalidateOrganizationCache, sendCancellationFeedback } from "./utils";

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

  revalidateOrganizationCache(organization.id);

  await Promise.allSettled([
    db.organization.update({
      where: {
        stripeId,
      },
      data: {
        paymentFailedAt: null,
        ...planToOrganizationFields(FREE_PLAN),
      },
    }),
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
    // TODO: disable / delete other pro only features
  ]);
}
