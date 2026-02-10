import { NextResponse } from "next/server";
import { log } from "@/lib/log";

import type { Stripe } from "@agentset/stripe";
import { db } from "@agentset/db/client";
import { getPlanFromPriceId, PRO_PLAN_METERED } from "@agentset/stripe/plans";

import { sendCancellationFeedback, updateOrganizationPlan } from "./utils";

export async function customerSubscriptionUpdated(event: Stripe.Event) {
  const subscriptionUpdated = event.data.object as Stripe.Subscription;

  // ignore metered plan
  const priceId = subscriptionUpdated.items.data.filter(
    (item) =>
      item.price.lookup_key !== PRO_PLAN_METERED.monthly.lookupKey &&
      item.price.lookup_key !== PRO_PLAN_METERED.yearly.lookupKey,
  )[0]!.price.id;
  const plan = getPlanFromPriceId(priceId);

  if (!plan) {
    await log({
      message: `Invalid price ID in customer.subscription.updated event: ${priceId}`,
      type: "errors",
    });
    return;
  }

  const stripeId =
    typeof subscriptionUpdated.customer === "string"
      ? subscriptionUpdated.customer
      : subscriptionUpdated.customer.id;

  const organization = await db.organization.findUnique({
    where: {
      stripeId,
    },
    select: {
      id: true,
      plan: true,
      paymentFailedAt: true,
      members: {
        select: {
          user: {
            select: {
              email: true,
              name: true,
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
        "`* not found in Stripe webhook `customer.subscription.updated` callback",
    );
    return NextResponse.json({ received: true });
  }

  await updateOrganizationPlan({
    organization,
    priceId,
  });

  const subscriptionCanceled =
    subscriptionUpdated.status === "active" &&
    subscriptionUpdated.cancel_at_period_end;

  if (subscriptionCanceled) {
    const owners = organization.members.map(({ user }) => user);
    const cancelReason = subscriptionUpdated.cancellation_details?.feedback;

    await sendCancellationFeedback({
      owners,
      reason: cancelReason,
    });
  }
}
