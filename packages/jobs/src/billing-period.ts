import type { PrismaClient } from "@agentset/db";
import type { Stripe } from "@agentset/stripe";
import type { BillingPeriod } from "@agentset/utils";
import { isPeriodInvoicePaid } from "@agentset/stripe";
import {
  getStripeSubscriptionPeriod,
  getSubscriptionUsagePeriod,
  isLiveSubscription,
} from "@agentset/stripe/period";

import { triggerMeterOrgDocuments } from "./schema";

// The previous implementation re-metered existing documents when the period's
// renewal (or first) invoice was paid. On their first sync, organizations
// whose invoice was paid longer ago than this are taken as re-metered by it.
// The others are re-metered with its identifiers, which Stripe dedups for 24
// hours in case it ran anyway.
const LEGACY_REMETER_DELAY_MS = 60 * 60 * 1000;

export type BillingPeriodChange =
  | "initialized"
  | "rolled-over"
  | "updated"
  | "unchanged";

/**
 * Moves an organization to `period`, the usage period that contains `now`.
 *
 * When `period` starts after the stored one, the stored period is over: the
 * pages deleted during it stop counting towards the quota and retrievals
 * reset. Every write is a compare-and-swap on the stored period start, so
 * retries, duplicate webhooks and a webhook racing the cron release once, and
 * a run that is late (or follows missed runs) still releases exactly once.
 * Deletions recorded after the read stay in deletedPages for the new period.
 */
export async function applyBillingPeriod(
  db: PrismaClient,
  {
    organizationId,
    period,
    billingCycleStart,
    now = new Date(),
  }: {
    organizationId: string;
    period: BillingPeriod;
    billingCycleStart?: number;
    now?: Date;
  },
): Promise<BillingPeriodChange> {
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      billingPeriodStart: true,
      billingPeriodEnd: true,
      billingCycleStart: true,
      deletedPages: true,
      usageLastChecked: true,
    },
  });
  if (!organization) return "unchanged";

  const { billingPeriodStart: storedStart, deletedPages } = organization;
  const periodData = {
    billingPeriodStart: period.start,
    billingPeriodEnd: period.end,
    ...(billingCycleStart !== undefined && { billingCycleStart }),
    usageLastChecked: now,
  };
  const releaseData = {
    ...(deletedPages > 0 && {
      totalPages: { decrement: deletedPages },
      deletedPages: { decrement: deletedPages },
    }),
    searchUsage: 0,
  };

  if (!storedStart) {
    // first stored period. The previous daily reset already released periods
    // that started before its last run over this organization
    const release = period.start > organization.usageLastChecked;
    const { count } = await db.organization.updateMany({
      where: { id: organizationId, billingPeriodStart: null },
      data: { ...periodData, ...(release && releaseData) },
    });
    return count > 0 ? "initialized" : "unchanged";
  }

  if (period.start > storedStart) {
    const { count } = await db.organization.updateMany({
      where: { id: organizationId, billingPeriodStart: storedStart },
      data: { ...periodData, ...releaseData },
    });
    return count > 0 ? "rolled-over" : "unchanged";
  }

  // same or earlier start: Stripe moved the period without ending it (e.g. a
  // schedule changing the renewal date), nothing is released
  if (
    period.start.getTime() === storedStart.getTime() &&
    period.end.getTime() === organization.billingPeriodEnd?.getTime() &&
    (billingCycleStart === undefined ||
      billingCycleStart === organization.billingCycleStart)
  ) {
    return "unchanged";
  }

  const { count } = await db.organization.updateMany({
    where: { id: organizationId, billingPeriodStart: storedStart },
    data: periodData,
  });
  return count > 0 ? "updated" : "unchanged";
}

/**
 * Re-meters the organization's existing documents once per Stripe billing
 * period: metered usage restarts from zero whenever Stripe starts a new
 * period, whatever caused it (renewal, billing date change, trial end, new
 * subscription).
 */
export async function remeterIfNewStripePeriod(
  db: PrismaClient,
  {
    organizationId,
    periodStart,
  }: { organizationId: string; periodStart: Date },
) {
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { meteredPeriodStart: true },
  });
  if (!organization) return false;

  const previous = organization.meteredPeriodStart;
  if (previous && previous >= periodStart) return false;

  const { count } = await db.organization.updateMany({
    where: { id: organizationId, meteredPeriodStart: previous },
    data: { meteredPeriodStart: periodStart },
  });
  if (count === 0) return false; // someone else claimed it

  try {
    await triggerMeterOrgDocuments({
      organizationId,
      periodStart: periodStart.toISOString(),
      // never re-metered by this implementation: dedup against the previous
      // one, and against ingests metered without a period
      ...(!previous && { legacyIdentifiers: true }),
    });
  } catch (error) {
    // release the claim so the webhook retry (or the cron) meters it
    await db.organization.updateMany({
      where: { id: organizationId, meteredPeriodStart: periodStart },
      data: { meteredPeriodStart: previous },
    });
    throw error;
  }

  return true;
}

/**
 * Aligns the organization's usage period with its Stripe subscription, rolling
 * it over (and re-metering) when Stripe has started a new period. Returns null
 * when the subscription doesn't define a current period.
 */
export async function syncSubscriptionBillingPeriod(
  db: PrismaClient,
  {
    organizationId,
    subscription,
    now = new Date(),
  }: {
    organizationId: string;
    subscription: Stripe.Subscription;
    now?: Date;
  },
) {
  if (!isLiveSubscription(subscription)) return null;

  const stripePeriod = getStripeSubscriptionPeriod(subscription);
  const period = getSubscriptionUsagePeriod(subscription, now);
  // Stripe hasn't renewed the subscription yet
  if (!stripePeriod || !period || stripePeriod.end <= now) return null;

  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { billingPeriodStart: true, meteredPeriodStart: true },
  });
  if (
    organization &&
    !organization.billingPeriodStart &&
    !organization.meteredPeriodStart &&
    (await isPeriodInvoicePaid({
      subscription: subscription.id,
      periodStart: stripePeriod.start,
      paidBefore: new Date(now.getTime() - LEGACY_REMETER_DELAY_MS),
    }))
  ) {
    // first sync of an organization the previous implementation already
    // re-metered for this period
    await db.organization.updateMany({
      where: {
        id: organizationId,
        billingPeriodStart: null,
        meteredPeriodStart: null,
      },
      data: { meteredPeriodStart: stripePeriod.start },
    });
  }

  // before rolling over: if triggering fails, the organization stays due so
  // the webhook retry or the next cron run meters it
  await remeterIfNewStripePeriod(db, {
    organizationId,
    periodStart: stripePeriod.start,
  });

  return applyBillingPeriod(db, {
    organizationId,
    period,
    billingCycleStart: stripePeriod.anchor.getUTCDate(),
    now,
  });
}
