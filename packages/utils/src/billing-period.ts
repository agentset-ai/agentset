// Billing periods are half-open UTC intervals [start, end). Every period is
// derived from a fixed anchor (never chained from the previous end), so an
// anchor on the 31st goes Jan 31 -> Feb 28 -> Mar 31 instead of drifting.

export interface BillingPeriod {
  start: Date;
  end: Date;
}

const daysInMonthUTC = (year: number, month: number) =>
  new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

/**
 * `anchor` moved `months` calendar months (UTC), keeping its time of day and
 * clamping its day of month to the length of the target month.
 */
export const addMonthsClamped = (anchor: Date, months: number) => {
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth() + months;
  const day = Math.min(
    anchor.getUTCDate(),
    daysInMonthUTC(year, month), // Date.UTC normalizes month overflow
  );

  return new Date(
    Date.UTC(
      year,
      month,
      day,
      anchor.getUTCHours(),
      anchor.getUTCMinutes(),
      anchor.getUTCSeconds(),
      anchor.getUTCMilliseconds(),
    ),
  );
};

/**
 * The monthly period anchored on `anchor` that contains `at`. Works for any
 * distance between the two, so missed periods are skipped in one step.
 */
export const getMonthlyPeriodAt = (anchor: Date, at: Date): BillingPeriod => {
  let months =
    (at.getUTCFullYear() - anchor.getUTCFullYear()) * 12 +
    (at.getUTCMonth() - anchor.getUTCMonth());

  // the estimate is off by at most one month in either direction
  if (addMonthsClamped(anchor, months) > at) months -= 1;
  if (addMonthsClamped(anchor, months + 1) <= at) months += 1;

  return {
    start: addMonthsClamped(anchor, months),
    end: addMonthsClamped(anchor, months + 1),
  };
};

/**
 * Anchor of organizations without a Stripe subscription: their cycle day, or
 * the day they were created if they never subscribed. The time of day carries
 * over from their current period (e.g. the one of a canceled subscription),
 * and defaults to noon UTC, when the usage reset historically ran. January
 * has 31 days, so any cycle day is representable without clamping.
 */
export const getCalendarBillingAnchor = ({
  billingCycleStart,
  createdAt,
  billingPeriodStart,
}: {
  billingCycleStart: number | null;
  createdAt: Date;
  billingPeriodStart?: Date | null;
}) => {
  const day = billingCycleStart ?? createdAt.getUTCDate();
  if (!billingPeriodStart) return new Date(Date.UTC(2000, 0, day, 12));

  return new Date(
    Date.UTC(
      2000,
      0,
      day,
      billingPeriodStart.getUTCHours(),
      billingPeriodStart.getUTCMinutes(),
      billingPeriodStart.getUTCSeconds(),
      billingPeriodStart.getUTCMilliseconds(),
    ),
  );
};
