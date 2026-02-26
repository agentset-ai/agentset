import { limiter } from "@/lib/bottleneck";
import { APP_DOMAIN } from "@/lib/constants";
import { log } from "@/lib/log";

import type { Stripe } from "@agentset/stripe";
import { Prisma } from "@agentset/db";
import { db } from "@agentset/db/client";
import { sendEmail, UpgradeEmail } from "@agentset/emails";
import { triggerMeterOrgDocuments } from "@agentset/jobs";
import {
  parseEnterprisePlanMetadata,
  planToOrganizationFields,
  stripe,
} from "@agentset/stripe";
import { getPlanFromPriceId } from "@agentset/stripe/plans";
import { capitalize } from "@agentset/utils";

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

  const stripeId =
    typeof checkoutSession.customer === "string"
      ? checkoutSession.customer
      : checkoutSession.customer.id;
  const organizationId = checkoutSession.client_reference_id;

  const subscription = await stripe.subscriptions.retrieve(
    checkoutSession.subscription as string,
  );

  // ignore metered plan
  const items = subscription.items.data;
  const price = items.filter(
    (item) =>
      item.price.recurring?.usage_type !== "metered" &&
      !item.price.recurring?.meter,
  )[0]?.price;
  const priceId = price?.id;
  const period = price?.recurring?.interval === "month" ? "monthly" : "yearly";
  const plan = getPlanFromPriceId(priceId);
  const enterpriseFields = plan
    ? null
    : await parseEnterprisePlanMetadata(items);

  let planName: string;
  let planData: Prisma.OrganizationUpdateInput;

  if (plan) {
    planName = capitalize(plan.name) as string;
    planData = planToOrganizationFields(plan);
  } else if (enterpriseFields) {
    planName = capitalize(enterpriseFields.plan) as string;
    planData = enterpriseFields;
  } else {
    await log({
      message: `Invalid price ID in checkout.session.completed event: ${priceId}`,
      type: "errors",
    });
    return;
  }

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
      ...planData,
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
          subject: `Thank you for upgrading to Agentset ${planName}!`,
          react: UpgradeEmail({
            name: user.name || null,
            email: user.email,
            plan: {
              name: planName,
              features: plan?.features ?? [],
            },
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
      message: `🎉 New ${planName} subscriber: 
Period: \`${period}\`
Organization: \`${organization.slug}\`
Members: \`${organization.members.map(({ user }) => user.email).join(", ")}\``,
      type: "subscribers",
    }),
  ]);
}
