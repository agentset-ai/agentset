import type { Stripe } from "@agentset/stripe";
import { db } from "@agentset/db/client";
import { getInvoiceSubscriptionId } from "@agentset/stripe/period";
import { isFreePlan } from "@agentset/stripe/plans";

import { syncOrganizationBillingPeriod } from "./utils";

export async function invoicePaymentSucceeded(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;

  // Every subscription invoice can come with a new billing period: renewals
  // (subscription_cycle), but also billing date changes and schedule phase
  // transitions (subscription_update). The sync only rolls over and
  // re-meters when Stripe's period actually moved, so it is a no-op when
  // customer.subscription.updated or checkout.session.completed got there
  // first.
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const stripeId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;

  if (!stripeId) return;

  const organization = await db.organization.findUnique({
    where: { stripeId },
    select: { id: true, plan: true },
  });

  if (!organization || isFreePlan(organization.plan)) return;

  await syncOrganizationBillingPeriod({
    organizationId: organization.id,
    subscription: subscriptionId,
  });
}
