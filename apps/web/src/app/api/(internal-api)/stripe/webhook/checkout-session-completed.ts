import { limiter } from "@/lib/bottleneck";
import { APP_DOMAIN } from "@/lib/constants";
import { log } from "@/lib/log";
import { sendEmail } from "@/lib/resend";

import type { Stripe } from "@agentset/stripe";
import { db } from "@agentset/db";
import { UpgradeEmail } from "@agentset/emails";
import { triggerMeterOrgDocuments } from "@agentset/jobs";
import { stripe } from "@agentset/stripe";
import {
  getPlanFromPriceId,
  planToOrganizationFields,
  PRO_PLAN_METERED,
} from "@agentset/stripe/plans";

import { revalidateOrganizationCache } from "./utils";

export async function checkoutSessionCompleted(event: Stripe.Event) {
  const checkoutSession = event.data.object as Stripe.Checkout.Session;

  if (checkoutSession.mode === "setup") {
    return;
  }

  if (
    checkoutSession.client_reference_id === null ||
    checkoutSession.customer === null
  ) {
    await log({
      message: "Missing items in Stripe webhook callback",
      type: "errors",
    });
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(
    checkoutSession.subscription as string,
  );

  // ignore metered plan
  const price = subscription.items.data.filter(
    (item) =>
      item.price.lookup_key !== PRO_PLAN_METERED.monthly.lookupKey &&
      item.price.lookup_key !== PRO_PLAN_METERED.yearly.lookupKey,
  )[0]?.price;
  const priceId = price?.id;
  const period = price?.recurring?.interval === "month" ? "monthly" : "yearly";
  const plan = getPlanFromPriceId(priceId);

  if (!plan) {
    await log({
      message: `Invalid price ID in checkout.session.completed event: ${priceId}`,
      type: "errors",
    });
    return;
  }

  const stripeId =
    typeof checkoutSession.customer === "string"
      ? checkoutSession.customer
      : checkoutSession.customer.id;
  const organizationId = checkoutSession.client_reference_id;

  // when the organization subscribes to a plan, set their stripe customer ID
  // in the database for easy identification in future webhook events
  // also update the billingCycleStart to today's date
  const organization = await db.organization.update({
    where: {
      id: organizationId,
    },
    data: {
      stripeId,
      billingCycleStart: new Date().getDate(),
      paymentFailedAt: null,
      ...planToOrganizationFields(plan),
    },
    select: {
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

  revalidateOrganizationCache(organizationId);

  await Promise.allSettled([
    ...organization.members.map(({ user }) =>
      limiter.schedule(() =>
        sendEmail({
          email: user.email,
          replyTo: "contact@agentset.ai",
          subject: `Thank you for upgrading to Agentset ${plan.name}!`,
          react: UpgradeEmail({
            name: user.name || null,
            email: user.email,
            plan,
            domain: APP_DOMAIN,
          }),
          variant: "marketing",
        }),
      ),
    ),
    triggerMeterOrgDocuments({
      organizationId,
    }),
    log({
      message: `🎉 New ${plan.name} subscriber: 
Period: \`${period}\`
Organization: \`${organization.slug}\`
Members: \`${organization.members.map(({ user }) => user.email).join(", ")}\``,
      type: "subscribers",
    }),
  ]);
}
