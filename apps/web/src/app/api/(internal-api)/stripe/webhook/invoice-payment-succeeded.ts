import type { Stripe } from "@agentset/stripe";
import { db } from "@agentset/db/client";
import { triggerMeterOrgDocuments } from "@agentset/jobs";
import { isFreePlan } from "@agentset/stripe/plans";

export async function invoicePaymentSucceeded(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;

  // Only handle subscription renewals, not first checkout
  if (invoice.billing_reason !== "subscription_cycle") return;

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

  await triggerMeterOrgDocuments({ organizationId: organization.id });
}
