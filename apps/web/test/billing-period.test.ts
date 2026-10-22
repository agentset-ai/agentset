import { getNextCycleResetDate } from "@/components/pages-usage-tooltip";
import { describe, expect, it, vi } from "vitest";

import type { Stripe } from "@agentset/stripe";
import {
  getInvoiceSubscriptionId,
  getStripeSubscriptionPeriod,
  getSubscriptionUsagePeriod,
} from "@agentset/stripe/period";
import {
  addMonthsClamped,
  getCalendarBillingAnchor,
  getMonthlyPeriodAt,
} from "@agentset/utils";

import { getDocumentMeterIdentifier } from "../../../packages/stripe/src/meters";

// meters.ts needs the Stripe client and env, its identifier helper doesn't
vi.mock("../../../packages/stripe/src/instance", () => ({ stripe: {} }));
vi.mock("../../../packages/stripe/src/plans", () => ({}));
vi.mock("@/lib/utils", () => ({ formatNumber: String }));

const utc = (iso: string) => new Date(`${iso}Z`);
const unix = (iso: string) => utc(iso).getTime() / 1000;
const iso = (date: Date) => date.toISOString();

describe("addMonthsClamped", () => {
  it("clamps the 31st to short months without drifting", () => {
    const anchor = utc("2026-01-31T07:12:05.000");
    expect([1, 2, 3, 4].map((m) => iso(addMonthsClamped(anchor, m)))).toEqual([
      "2026-02-28T07:12:05.000Z",
      "2026-03-31T07:12:05.000Z",
      "2026-04-30T07:12:05.000Z",
      "2026-05-31T07:12:05.000Z",
    ]);
  });

  it("handles leap years and year boundaries", () => {
    expect(iso(addMonthsClamped(utc("2027-12-30T00:00:00"), 2))).toBe(
      "2028-02-29T00:00:00.000Z",
    );
    expect(iso(addMonthsClamped(utc("2026-12-15T12:00:00"), 1))).toBe(
      "2027-01-15T12:00:00.000Z",
    );
    expect(iso(addMonthsClamped(utc("2026-01-15T12:00:00"), -1))).toBe(
      "2025-12-15T12:00:00.000Z",
    );
  });
});

describe("getMonthlyPeriodAt", () => {
  const anchor = utc("2026-04-20T07:12:05");

  it("returns the period containing the date", () => {
    const period = getMonthlyPeriodAt(anchor, utc("2026-10-21T10:00:00"));
    expect(iso(period.start)).toBe("2026-10-20T07:12:05.000Z");
    expect(iso(period.end)).toBe("2026-11-20T07:12:05.000Z");
  });

  it("is half-open at the boundary", () => {
    const boundary = utc("2026-10-20T07:12:05");
    expect(iso(getMonthlyPeriodAt(anchor, boundary).start)).toBe(
      "2026-10-20T07:12:05.000Z",
    );
    expect(
      iso(getMonthlyPeriodAt(anchor, new Date(boundary.getTime() - 1)).start),
    ).toBe("2026-09-20T07:12:05.000Z");
  });

  it("skips any number of missed periods", () => {
    const period = getMonthlyPeriodAt(anchor, utc("2027-12-25T00:00:00"));
    expect(iso(period.start)).toBe("2027-12-20T07:12:05.000Z");
    expect(iso(period.end)).toBe("2028-01-20T07:12:05.000Z");
  });

  it("clamps end-of-month anchors", () => {
    const period = getMonthlyPeriodAt(
      utc("2000-01-31T12:00:00"),
      utc("2026-02-28T13:00:00"),
    );
    expect(iso(period.start)).toBe("2026-02-28T12:00:00.000Z");
    expect(iso(period.end)).toBe("2026-03-31T12:00:00.000Z");

    const before = getMonthlyPeriodAt(
      utc("2000-01-31T12:00:00"),
      utc("2026-02-28T11:00:00"),
    );
    expect(iso(before.start)).toBe("2026-01-31T12:00:00.000Z");
    expect(iso(before.end)).toBe("2026-02-28T12:00:00.000Z");
  });
});

describe("getCalendarBillingAnchor", () => {
  const createdAt = utc("2026-06-15T23:30:00");

  it("uses noon UTC on the cycle day, or the creation day", () => {
    expect(
      iso(getCalendarBillingAnchor({ billingCycleStart: 20, createdAt })),
    ).toBe("2000-01-20T12:00:00.000Z");
    expect(
      iso(getCalendarBillingAnchor({ billingCycleStart: null, createdAt })),
    ).toBe("2000-01-15T12:00:00.000Z");
  });

  it("keeps the time of day of the current period", () => {
    expect(
      iso(
        getCalendarBillingAnchor({
          billingCycleStart: 31,
          createdAt,
          billingPeriodStart: utc("2026-02-28T07:12:05"),
        }),
      ),
    ).toBe("2000-01-31T07:12:05.000Z");
  });
});

const subscription = ({
  shape,
  interval = "month",
  start = "2026-10-20T07:12:05",
  end = "2026-11-20T07:12:05",
  anchor = "2026-04-20T07:12:05",
}: {
  shape: "acacia" | "basil";
  interval?: "month" | "year";
  start?: string;
  end?: string;
  anchor?: string;
}) => {
  const period = {
    current_period_start: unix(start),
    current_period_end: unix(end),
  };
  return {
    status: "active",
    billing_cycle_anchor: unix(anchor),
    ...(shape === "acacia" && period),
    items: {
      data: [
        {
          price: { recurring: { usage_type: "metered", interval } },
          ...(shape === "basil" && {
            current_period_start: unix("2026-01-01T00:00:00"),
            current_period_end: unix("2026-02-01T00:00:00"),
          }),
        },
        {
          price: {
            recurring: { usage_type: "licensed", interval, interval_count: 1 },
          },
          ...(shape === "basil" && period),
        },
      ],
    },
  } as unknown as Stripe.Subscription;
};

describe("getStripeSubscriptionPeriod", () => {
  it.each(["acacia", "basil"] as const)(
    "reads the licensed item period from %s objects",
    (shape) => {
      const period = getStripeSubscriptionPeriod(subscription({ shape }));
      expect(iso(period!.start)).toBe("2026-10-20T07:12:05.000Z");
      expect(iso(period!.end)).toBe("2026-11-20T07:12:05.000Z");
      expect(iso(period!.anchor)).toBe("2026-04-20T07:12:05.000Z");
    },
  );
});

describe("getSubscriptionUsagePeriod", () => {
  it("uses Stripe's period for monthly subscriptions", () => {
    const period = getSubscriptionUsagePeriod(
      subscription({ shape: "acacia" }),
      utc("2026-10-21T00:00:00"),
    );
    expect(iso(period!.start)).toBe("2026-10-20T07:12:05.000Z");
    expect(iso(period!.end)).toBe("2026-11-20T07:12:05.000Z");
  });

  it("uses monthly periods on the anchor for yearly subscriptions", () => {
    const period = getSubscriptionUsagePeriod(
      subscription({
        shape: "acacia",
        interval: "year",
        start: "2026-04-20T07:12:05",
        end: "2027-04-20T07:12:05",
      }),
      utc("2026-10-21T00:00:00"),
    );
    expect(iso(period!.start)).toBe("2026-10-20T07:12:05.000Z");
    expect(iso(period!.end)).toBe("2026-11-20T07:12:05.000Z");
  });
});

describe("getInvoiceSubscriptionId", () => {
  it("reads acacia and basil invoices", () => {
    expect(getInvoiceSubscriptionId({ subscription: "sub_1" } as never)).toBe(
      "sub_1",
    );
    expect(
      getInvoiceSubscriptionId({
        parent: { subscription_details: { subscription: { id: "sub_2" } } },
      } as never),
    ).toBe("sub_2");
    expect(getInvoiceSubscriptionId({ subscription: null } as never)).toBe(
      null,
    );
  });
});

describe("getDocumentMeterIdentifier", () => {
  it("scopes re-meter identifiers to the billing period", () => {
    expect(getDocumentMeterIdentifier("abc")).toBe("doc_abc");
    expect(
      getDocumentMeterIdentifier("doc_abc", utc("2026-10-20T07:12:05")),
    ).toBe(`doc_abc_p${unix("2026-10-20T07:12:05")}`);
  });
});

describe("getNextCycleResetDate", () => {
  const now = utc("2026-10-21T10:00:00");

  it("shows the stored period end in UTC", () => {
    expect(getNextCycleResetDate(null, now)).toBe(null);
    expect(getNextCycleResetDate("2026-11-20T07:12:05.000Z", now)).toBe(
      "Nov 20",
    );
    expect(getNextCycleResetDate(utc("2026-10-21T23:00:00"), now)).toBe(
      "today",
    );
  });

  it("doesn't move to the next month when the rollover is late", () => {
    expect(getNextCycleResetDate(utc("2026-10-20T07:12:05"), now)).toBe("soon");
  });
});
