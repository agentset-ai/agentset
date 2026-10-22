import { schedules } from "@trigger.dev/sdk";

import type { PrismaClient } from "@agentset/db";
import { getLiveSubscription } from "@agentset/stripe";
import { isFreePlan } from "@agentset/stripe/plans";
import {
  chunkArray,
  getCalendarBillingAnchor,
  getMonthlyPeriodAt,
  logError,
} from "@agentset/utils";

import type { BillingPeriodChange } from "../billing-period";
import {
  applyBillingPeriod,
  syncSubscriptionBillingPeriod,
} from "../billing-period";
import { getDb } from "../db";
import { sanitizeRunErrors } from "../errors";

const limit = 100;
const CONCURRENCY = 10;
// how long a paid organization waits for Stripe to renew its subscription
// before falling back to calendar periods
const STRIPE_RENEWAL_GRACE_MS = 24 * 60 * 60 * 1000;

const organizationSelect = {
  id: true,
  plan: true,
  stripeId: true,
  billingCycleStart: true,
  billingPeriodStart: true,
  billingPeriodEnd: true,
  createdAt: true,
} as const;

type DueOrganization = {
  id: string;
  plan: string;
  stripeId: string | null;
  billingCycleStart: number | null;
  billingPeriodStart: Date | null;
  billingPeriodEnd: Date | null;
  createdAt: Date;
};

async function rollOver(
  db: PrismaClient,
  organization: DueOrganization,
  now: Date,
): Promise<BillingPeriodChange | "waiting"> {
  if (!isFreePlan(organization.plan) && organization.stripeId) {
    const subscription = await getLiveSubscription(organization.stripeId);
    if (subscription) {
      const change = await syncSubscriptionBillingPeriod(db, {
        organizationId: organization.id,
        subscription,
        now,
      });
      if (change) return change;

      // Stripe hasn't started the next period yet, check again next run
      if (
        organization.billingPeriodEnd &&
        organization.billingPeriodEnd.getTime() >
          now.getTime() - STRIPE_RENEWAL_GRACE_MS
      ) {
        return "waiting";
      }
    }
  }

  // free plan, or no subscription billing the organization
  return applyBillingPeriod(db, {
    organizationId: organization.id,
    period: getMonthlyPeriodAt(getCalendarBillingAnchor(organization), now),
    now,
  });
}

export const usageCronJob = schedules.task({
  id: "reset-usage",
  // Rolls organizations over to their next usage period: releases the pages
  // deleted during the previous one and resets retrievals. Every organization
  // whose period is over (or was never set) is picked up, so a failed or
  // missed run is caught up by the next one. Paid organizations normally roll
  // over earlier, from the Stripe webhooks; this is their backstop.
  // Runs every hour at minute 5 (5 * * * *)
  cron: "5 * * * *",
  run: sanitizeRunErrors(async () => {
    const db = getDb();
    const now = new Date();

    const results: Record<string, number> = {};
    let failed = 0;
    let cursor: string | undefined;

    while (true) {
      const organizations = await db.organization.findMany({
        where: {
          OR: [{ billingPeriodEnd: null }, { billingPeriodEnd: { lte: now } }],
          // keyset pagination: rolled over organizations leave the filter, so
          // Prisma's cursor (which needs the cursor row to match) can't be used
          ...(cursor && { id: { gt: cursor } }),
        },
        select: organizationSelect,
        orderBy: { id: "asc" },
        take: limit,
      });

      if (organizations.length === 0) break;
      cursor = organizations.at(-1)!.id;

      for (const batch of chunkArray(organizations, CONCURRENCY)) {
        const settled = await Promise.allSettled(
          batch.map((organization) => rollOver(db, organization, now)),
        );

        settled.forEach((result, i) => {
          if (result.status === "fulfilled") {
            results[result.value] = (results[result.value] ?? 0) + 1;
          } else {
            failed++;
            logError("Failed to roll over usage period", result.reason, {
              organizationId: batch[i]!.id,
            });
          }
        });
      }
    }

    // the failed organizations are retried by the next run
    if (failed > 0) {
      throw new Error(`Failed to roll over ${failed} organizations`);
    }

    return results;
  }),
});
