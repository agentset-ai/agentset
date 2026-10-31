import type Stripe from "stripe";

import type { BillingPeriod } from "@agentset/utils";
import { getMonthlyPeriodAt } from "@agentset/utils";

// subscriptions in these states still bill the customer for their period
export const LIVE_SUBSCRIPTION_STATUSES: Stripe.Subscription.Status[] = [
  "active",
  "trialing",
  "past_due",
];

export const isLiveSubscription = (subscription: Stripe.Subscription) =>
  LIVE_SUBSCRIPTION_STATUSES.includes(subscription.status);

const isMeteredItem = (item: Stripe.SubscriptionItem) =>
  item.price.recurring?.usage_type === "metered" ||
  !!item.price.recurring?.meter;

const fromUnix = (seconds: number) => new Date(seconds * 1000);

/**
 * The subscription's current Stripe billing period, read from the licensed
 * (flat fee) item. Our client is pinned to 2025-02-24.acacia where the period
 * lives on the subscription, while the SDK types (and newer webhook endpoint
 * versions) carry it on the items, so both shapes are supported.
 */
export const getStripeSubscriptionPeriod = (
  subscription: Stripe.Subscription,
) => {
  const items = subscription.items.data;
  const item = items.find((i) => !isMeteredItem(i)) ?? items[0];

  const legacy = subscription as unknown as {
    current_period_start?: number;
    current_period_end?: number;
  };
  const start = item?.current_period_start ?? legacy.current_period_start;
  const end = item?.current_period_end ?? legacy.current_period_end;
  if (!start || !end) return null;

  const recurring = item?.price.recurring;
  return {
    start: fromUnix(start),
    end: fromUnix(end),
    anchor: fromUnix(subscription.billing_cycle_anchor),
    monthly:
      !recurring ||
      (recurring.interval === "month" && recurring.interval_count === 1),
  };
};

/**
 * The period deleted pages and retrievals are counted over. Monthly
 * subscriptions use Stripe's period as is, so the dashboard rolls over
 * exactly when Stripe does. Other intervals (yearly) still reset usage
 * monthly, on the Stripe billing anchor.
 */
export const getSubscriptionUsagePeriod = (
  subscription: Stripe.Subscription,
  now = new Date(),
): BillingPeriod | null => {
  const period = getStripeSubscriptionPeriod(subscription);
  if (!period) return null;
  if (period.monthly) return { start: period.start, end: period.end };

  return getMonthlyPeriodAt(period.anchor, now);
};

/** Invoice -> subscription id, for both acacia and basil invoice shapes. */
export const getInvoiceSubscriptionId = (invoice: Stripe.Invoice) => {
  const legacy = invoice as unknown as {
    subscription?: string | { id: string } | null;
  };
  const subscription =
    legacy.subscription ?? invoice.parent?.subscription_details?.subscription;
  if (!subscription) return null;
  return typeof subscription === "string" ? subscription : subscription.id;
};
