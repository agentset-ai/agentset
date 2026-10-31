// Runs the usage period rollover against a real Postgres database, since its
// guarantees come from compare-and-swap updates. Skipped unless
// BILLING_TEST_DATABASE_URL points at a disposable database with the
// migrations applied (it deletes the organizations it creates).
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { Stripe } from "@agentset/stripe";
import { PrismaClient } from "@agentset/db";

const triggerMeterOrgDocuments = vi.fn((_: unknown) => Promise.resolve());
const getLiveSubscription = vi.fn(
  (_: string): Promise<Stripe.Subscription | null> => Promise.resolve(null),
);
const meterDocumentsPages = vi.fn((_: unknown) => Promise.resolve());
const isPeriodInvoicePaid = vi.fn((_: unknown) => Promise.resolve(false));

vi.mock("../../../packages/jobs/src/schema", () => ({
  METER_ORG_DOCUMENTS_JOB_ID: "meter-org-documents-job",
  meterOrgDocumentsBodySchema: {},
  triggerMeterOrgDocuments: (body: unknown) => triggerMeterOrgDocuments(body),
}));
vi.mock("../../../packages/jobs/src/db", () => ({ getDb: () => db }));
vi.mock("../../../packages/jobs/src/errors", () => ({
  sanitizeRunErrors: (fn: unknown) => fn,
}));
vi.mock("@trigger.dev/sdk", () => ({
  schedules: { task: (definition: unknown) => definition },
  schemaTask: (definition: unknown) => definition,
}));
vi.mock("@agentset/stripe", () => ({
  getLiveSubscription: (customer: string) => getLiveSubscription(customer),
  createMeterEventSessionToken: () => Promise.resolve("token"),
  meterDocumentsPages: (body: unknown) => meterDocumentsPages(body),
  isPeriodInvoicePaid: (body: unknown) => isPeriodInvoicePaid(body),
}));
vi.mock("@agentset/stripe/plans", () => ({
  isFreePlan: (plan: string) => plan === "free",
}));

// test-only opt-in, not an app env var
// eslint-disable-next-line no-restricted-properties, turbo/no-undeclared-env-vars
const url = process.env.BILLING_TEST_DATABASE_URL;
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: url ?? "postgresql://localhost/unused",
  }),
});

const {
  applyBillingPeriod,
  remeterIfNewStripePeriod,
  syncSubscriptionBillingPeriod,
} = await import("../../../packages/jobs/src/billing-period");
const { usageCronJob } = await import("../../../packages/jobs/src/cron/usage");
const { meterOrgDocuments } =
  await import("../../../packages/jobs/src/tasks/meter-org-documents");
const runMeter = (payload: Record<string, unknown>) =>
  (
    meterOrgDocuments as unknown as {
      run: (payload: Record<string, unknown>) => Promise<unknown>;
    }
  ).run(payload);
const runCron = () =>
  (usageCronJob as unknown as { run: () => Promise<unknown> }).run();

const utc = (iso: string) => new Date(`${iso}Z`);
const unix = (iso: string) => utc(iso).getTime() / 1000;

const ORG_PREFIX = "org_billing_test_";
let orgCount = 0;

const createOrganization = async (
  data: Partial<{
    plan: string;
    stripeId: string;
    totalPages: number;
    deletedPages: number;
    searchUsage: number;
    billingCycleStart: number | null;
    billingPeriodStart: Date | null;
    billingPeriodEnd: Date | null;
    meteredPeriodStart: Date | null;
    usageLastChecked: Date;
    createdAt: Date;
  }> = {},
) => {
  const id = `${ORG_PREFIX}${++orgCount}`;
  await db.organization.create({
    data: { id, name: id, slug: id, ...data },
  });
  return id;
};

const getOrganization = (id: string) =>
  db.organization.findUniqueOrThrow({ where: { id } });

const subscription = ({
  start,
  end,
  anchor = "2026-04-20T07:12:05",
  status = "active",
}: {
  start: string;
  end: string;
  anchor?: string;
  status?: string;
}) =>
  ({
    id: "sub_1",
    status,
    created: unix(anchor),
    billing_cycle_anchor: unix(anchor),
    current_period_start: unix(start),
    current_period_end: unix(end),
    items: {
      data: [
        {
          price: {
            recurring: {
              usage_type: "licensed",
              interval: "month",
              interval_count: 1,
            },
          },
        },
      ],
    },
  }) as unknown as Stripe.Subscription;

const OCT = {
  start: utc("2026-10-20T07:12:05"),
  end: utc("2026-11-20T07:12:05"),
};
const SEP = {
  start: utc("2026-09-20T07:12:05"),
  end: utc("2026-10-20T07:12:05"),
};

describe.skipIf(!url)("usage period rollover", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    getLiveSubscription.mockResolvedValue(null);
    isPeriodInvoicePaid.mockResolvedValue(false);
    await db.organization.deleteMany({
      where: { id: { startsWith: ORG_PREFIX } },
    });
  });

  describe("meter-org-documents", () => {
    const setup = async () => {
      const id = await createOrganization({ plan: "pro", stripeId: "cus_1" });
      const namespace = await db.namespace.create({
        data: { name: id, slug: id, organizationId: id },
      });
      const ingestJob = await db.ingestJob.create({
        data: {
          namespaceId: namespace.id,
          payload: { type: "TEXT", text: "test" },
        },
      });
      const document = (
        name: string,
        meteredAt: Date | null,
        status: "COMPLETED" | "PROCESSING" = "COMPLETED",
      ) =>
        db.document.create({
          data: {
            name,
            namespaceId: namespace.id,
            ingestJobId: ingestJob.id,
            source: { type: "TEXT", text: "test" },
            status,
            totalPages: 10,
            meteredAt,
          },
        });

      const documents = {
        // ingested in the previous period
        old: await document("old", utc("2026-10-10T00:00:00")),
        // ingested before metering was recorded, or its meter call failed
        legacy: await document("legacy", null),
        // ingested after the renewal, before the re-meter
        renewal: await document("renewal", utc("2026-10-20T07:12:30")),
        // still being ingested: metered when it completes
        processing: await document("processing", null, "PROCESSING"),
        // being re-processed: not metered again when it completes
        reprocessing: await document(
          "reprocessing",
          utc("2026-10-10T00:00:00"),
          "PROCESSING",
        ),
      };
      return { id, documents };
    };

    const meteredDocuments = () =>
      meterDocumentsPages.mock.calls.flatMap(
        ([body]) => (body as { documents: { id: string }[] }).documents,
      );

    it("skips documents already metered in the period", async () => {
      const { id, documents } = await setup();

      await runMeter({
        organizationId: id,
        periodStart: OCT.start.toISOString(),
      });

      expect(
        meteredDocuments()
          .map((d) => d.id)
          .sort(),
      ).toEqual(
        [
          documents.old.id,
          documents.legacy.id,
          documents.reprocessing.id,
        ].sort(),
      );
      expect(meterDocumentsPages).toHaveBeenCalledWith(
        expect.objectContaining({ periodStart: OCT.start }),
      );
    });

    it("uses unscoped identifiers when asked to", async () => {
      const { id } = await setup();

      await runMeter({
        organizationId: id,
        periodStart: OCT.start.toISOString(),
        legacyIdentifiers: true,
      });

      expect(meterDocumentsPages).toHaveBeenCalledWith(
        expect.objectContaining({ periodStart: null }),
      );
    });
  });

  afterAll(async () => {
    await db.organization.deleteMany({
      where: { id: { startsWith: ORG_PREFIX } },
    });
    await db.$disconnect();
  });

  describe("applyBillingPeriod", () => {
    it("releases the previous period's deleted pages and resets retrievals", async () => {
      const id = await createOrganization({
        totalPages: 30,
        deletedPages: 20,
        searchUsage: 500,
        billingPeriodStart: SEP.start,
        billingPeriodEnd: SEP.end,
      });

      const now = utc("2026-10-20T08:00:00");
      expect(
        await applyBillingPeriod(db, { organizationId: id, period: OCT, now }),
      ).toBe("rolled-over");

      const organization = await getOrganization(id);
      expect(organization).toMatchObject({
        totalPages: 10,
        deletedPages: 0,
        searchUsage: 0,
        billingPeriodStart: OCT.start,
        billingPeriodEnd: OCT.end,
      });
    });

    it("releases once on retries and concurrent calls", async () => {
      const id = await createOrganization({
        totalPages: 30,
        deletedPages: 20,
        billingPeriodStart: SEP.start,
        billingPeriodEnd: SEP.end,
      });

      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          applyBillingPeriod(db, { organizationId: id, period: OCT }),
        ),
      );
      expect(results.filter((r) => r === "rolled-over")).toHaveLength(1);
      expect(
        await applyBillingPeriod(db, { organizationId: id, period: OCT }),
      ).toBe("unchanged");

      expect(await getOrganization(id)).toMatchObject({
        totalPages: 10,
        deletedPages: 0,
      });
    });

    it("keeps pages deleted after the rollover", async () => {
      const id = await createOrganization({
        totalPages: 30,
        deletedPages: 20,
        billingPeriodStart: SEP.start,
        billingPeriodEnd: SEP.end,
      });
      await applyBillingPeriod(db, { organizationId: id, period: OCT });

      // what delete-document does
      await db.organization.update({
        where: { id },
        data: { deletedPages: { increment: 4 } },
      });
      await applyBillingPeriod(db, { organizationId: id, period: OCT });

      expect(await getOrganization(id)).toMatchObject({
        totalPages: 10,
        deletedPages: 4,
      });
    });

    it("moves the period without releasing when it didn't end", async () => {
      const id = await createOrganization({
        totalPages: 30,
        deletedPages: 20,
        searchUsage: 7,
        billingCycleStart: 15,
        billingPeriodStart: utc("2026-10-15T09:00:00"),
        billingPeriodEnd: utc("2026-11-15T09:00:00"),
      });

      // e.g. a schedule moving the renewal to the 1st without a new period
      const period = {
        start: utc("2026-10-15T09:00:00"),
        end: utc("2026-11-01T00:00:00"),
      };
      expect(
        await applyBillingPeriod(db, {
          organizationId: id,
          period,
          billingCycleStart: 1,
        }),
      ).toBe("updated");

      expect(await getOrganization(id)).toMatchObject({
        totalPages: 30,
        deletedPages: 20,
        searchUsage: 7,
        billingCycleStart: 1,
        billingPeriodEnd: period.end,
      });
    });

    it("initializes without releasing what the old daily reset already handled", async () => {
      const id = await createOrganization({
        totalPages: 30,
        deletedPages: 20,
        searchUsage: 7,
        usageLastChecked: utc("2026-10-22T12:00:30"),
      });

      expect(
        await applyBillingPeriod(db, { organizationId: id, period: OCT }),
      ).toBe("initialized");

      expect(await getOrganization(id)).toMatchObject({
        totalPages: 30,
        deletedPages: 20,
        searchUsage: 7,
        billingPeriodStart: OCT.start,
      });
    });

    it("initializes and releases when the period started after the last reset", async () => {
      const id = await createOrganization({
        totalPages: 30,
        deletedPages: 20,
        usageLastChecked: utc("2026-10-19T12:00:30"),
      });

      await applyBillingPeriod(db, { organizationId: id, period: OCT });

      expect(await getOrganization(id)).toMatchObject({
        totalPages: 10,
        deletedPages: 0,
      });
    });
  });

  describe("remeterIfNewStripePeriod", () => {
    it("meters once per Stripe period", async () => {
      const id = await createOrganization({ meteredPeriodStart: SEP.start });

      const results = await Promise.all(
        Array.from({ length: 3 }, () =>
          remeterIfNewStripePeriod(db, {
            organizationId: id,
            periodStart: OCT.start,
          }),
        ),
      );
      expect(results.filter(Boolean)).toHaveLength(1);
      expect(triggerMeterOrgDocuments).toHaveBeenCalledExactlyOnceWith({
        organizationId: id,
        periodStart: OCT.start.toISOString(),
      });

      expect(
        await remeterIfNewStripePeriod(db, {
          organizationId: id,
          periodStart: SEP.start,
        }),
      ).toBe(false);
    });

    it("releases its claim when triggering fails", async () => {
      const id = await createOrganization({ meteredPeriodStart: SEP.start });
      triggerMeterOrgDocuments.mockRejectedValueOnce(new Error("down"));

      await expect(
        remeterIfNewStripePeriod(db, {
          organizationId: id,
          periodStart: OCT.start,
        }),
      ).rejects.toThrow("down");
      expect((await getOrganization(id)).meteredPeriodStart).toEqual(SEP.start);

      // the webhook retry meters it
      expect(
        await remeterIfNewStripePeriod(db, {
          organizationId: id,
          periodStart: OCT.start,
        }),
      ).toBe(true);
    });

    it("uses legacy identifiers the first time", async () => {
      const id = await createOrganization();

      await remeterIfNewStripePeriod(db, {
        organizationId: id,
        periodStart: OCT.start,
      });

      expect(triggerMeterOrgDocuments).toHaveBeenCalledExactlyOnceWith({
        organizationId: id,
        periodStart: OCT.start.toISOString(),
        legacyIdentifiers: true,
      });
    });
  });

  describe("syncSubscriptionBillingPeriod", () => {
    const paidOrganization = () =>
      createOrganization({
        plan: "pro",
        stripeId: "cus_1",
        totalPages: 33725.946,
        deletedPages: 21033.7,
        searchUsage: 100,
        billingCycleStart: 20,
        billingPeriodStart: SEP.start,
        billingPeriodEnd: SEP.end,
        meteredPeriodStart: SEP.start,
      });

    it("rolls over and re-meters on renewal, once across duplicate events", async () => {
      const id = await paidOrganization();
      const renewed = subscription({
        start: "2026-10-20T07:12:05",
        end: "2026-11-20T07:12:05",
      });
      const now = utc("2026-10-20T07:13:00");

      // customer.subscription.updated, then invoice.paid, then a duplicate
      for (let i = 0; i < 3; i++) {
        await syncSubscriptionBillingPeriod(db, {
          organizationId: id,
          subscription: renewed,
          now,
        });
      }

      const organization = await getOrganization(id);
      expect(organization.deletedPages).toBe(0);
      expect(organization.totalPages).toBeCloseTo(12692.246, 6);
      expect(organization).toMatchObject({
        searchUsage: 0,
        billingPeriodStart: OCT.start,
        billingPeriodEnd: OCT.end,
        meteredPeriodStart: OCT.start,
      });
      expect(triggerMeterOrgDocuments).toHaveBeenCalledOnce();
    });

    it("does nothing before Stripe renews", async () => {
      const id = await paidOrganization();

      expect(
        await syncSubscriptionBillingPeriod(db, {
          organizationId: id,
          subscription: subscription({
            start: "2026-09-20T07:12:05",
            end: "2026-10-20T07:12:05",
          }),
          now: utc("2026-10-20T07:12:30"),
        }),
      ).toBe(null);
      expect((await getOrganization(id)).deletedPages).toBe(21033.7);
      expect(triggerMeterOrgDocuments).not.toHaveBeenCalled();
    });

    it("rolls over and re-meters when the billing date moves", async () => {
      // renewals on the 15th, moved to the 1st by resetting the anchor on
      // Oct 15 (a subscription_update invoice, not subscription_cycle)
      const id = await createOrganization({
        plan: "pro",
        stripeId: "cus_2",
        totalPages: 50,
        deletedPages: 10,
        billingCycleStart: 15,
        billingPeriodStart: utc("2026-09-15T09:00:00"),
        billingPeriodEnd: utc("2026-10-15T09:00:00"),
        meteredPeriodStart: utc("2026-09-15T09:00:00"),
      });

      await syncSubscriptionBillingPeriod(db, {
        organizationId: id,
        subscription: subscription({
          start: "2026-10-15T09:00:00",
          end: "2026-11-01T00:00:00",
          anchor: "2026-11-01T00:00:00",
        }),
        now: utc("2026-10-15T09:05:00"),
      });

      expect(await getOrganization(id)).toMatchObject({
        totalPages: 40,
        deletedPages: 0,
        billingCycleStart: 1,
        billingPeriodEnd: utc("2026-11-01T00:00:00"),
      });
      expect(triggerMeterOrgDocuments).toHaveBeenCalledExactlyOnceWith({
        organizationId: id,
        periodStart: utc("2026-10-15T09:00:00").toISOString(),
      });

      // first renewal on the new date
      await syncSubscriptionBillingPeriod(db, {
        organizationId: id,
        subscription: subscription({
          start: "2026-11-01T00:00:00",
          end: "2026-12-01T00:00:00",
          anchor: "2026-11-01T00:00:00",
        }),
        now: utc("2026-11-01T00:01:00"),
      });
      expect(triggerMeterOrgDocuments).toHaveBeenCalledTimes(2);
    });

    it("doesn't roll over when re-metering can't be triggered", async () => {
      const id = await paidOrganization();
      triggerMeterOrgDocuments.mockRejectedValueOnce(new Error("down"));
      const renewed = subscription({
        start: "2026-10-20T07:12:05",
        end: "2026-11-20T07:12:05",
      });
      const now = utc("2026-10-20T07:13:00");

      await expect(
        syncSubscriptionBillingPeriod(db, {
          organizationId: id,
          subscription: renewed,
          now,
        }),
      ).rejects.toThrow("down");
      // still due, so the cron (or the webhook retry) tries again
      expect(await getOrganization(id)).toMatchObject({
        deletedPages: 21033.7,
        billingPeriodEnd: SEP.end,
        meteredPeriodStart: SEP.start,
      });

      await syncSubscriptionBillingPeriod(db, {
        organizationId: id,
        subscription: renewed,
        now,
      });
      expect(await getOrganization(id)).toMatchObject({
        deletedPages: 0,
        meteredPeriodStart: OCT.start,
      });
    });

    it("doesn't re-meter what the previous implementation metered on first sync", async () => {
      isPeriodInvoicePaid.mockResolvedValue(true);
      const id = await createOrganization({
        plan: "pro",
        stripeId: "cus_1",
        totalPages: 30,
        deletedPages: 20,
        usageLastChecked: utc("2026-10-22T12:00:30"),
      });

      expect(
        await syncSubscriptionBillingPeriod(db, {
          organizationId: id,
          subscription: subscription({
            start: "2026-10-20T07:12:05",
            end: "2026-11-20T07:12:05",
          }),
          now: utc("2026-10-22T13:05:00"),
        }),
      ).toBe("initialized");

      expect(await getOrganization(id)).toMatchObject({
        totalPages: 30,
        deletedPages: 20,
        billingPeriodStart: OCT.start,
        meteredPeriodStart: OCT.start,
      });
      expect(triggerMeterOrgDocuments).not.toHaveBeenCalled();
      expect(isPeriodInvoicePaid).toHaveBeenCalledWith({
        subscription: "sub_1",
        periodStart: OCT.start,
        paidBefore: utc("2026-10-22T12:05:00"),
      });
    });

    it("re-meters on first sync when the renewal invoice isn't paid yet", async () => {
      // e.g. past_due: the previous implementation only re-metered on payment
      const id = await createOrganization({
        plan: "pro",
        stripeId: "cus_1",
        usageLastChecked: utc("2026-10-22T12:00:30"),
      });

      await syncSubscriptionBillingPeriod(db, {
        organizationId: id,
        subscription: subscription({
          start: "2026-10-20T07:12:05",
          end: "2026-11-20T07:12:05",
          status: "past_due",
        }),
        now: utc("2026-10-22T13:05:00"),
      });

      expect(triggerMeterOrgDocuments).toHaveBeenCalledExactlyOnceWith({
        organizationId: id,
        periodStart: OCT.start.toISOString(),
        legacyIdentifiers: true,
      });
    });

    it("re-meters with legacy identifiers on a first sync right after renewal", async () => {
      const id = await createOrganization({
        plan: "pro",
        stripeId: "cus_1",
        usageLastChecked: utc("2026-10-19T12:00:30"),
      });

      await syncSubscriptionBillingPeriod(db, {
        organizationId: id,
        subscription: subscription({
          start: "2026-10-20T07:12:05",
          end: "2026-11-20T07:12:05",
        }),
        now: utc("2026-10-20T10:05:00"),
      });

      expect(triggerMeterOrgDocuments).toHaveBeenCalledExactlyOnceWith({
        organizationId: id,
        periodStart: OCT.start.toISOString(),
        legacyIdentifiers: true,
      });
      expect((await getOrganization(id)).meteredPeriodStart).toEqual(OCT.start);
    });

    it("ignores subscriptions that no longer bill", async () => {
      const id = await paidOrganization();
      expect(
        await syncSubscriptionBillingPeriod(db, {
          organizationId: id,
          subscription: subscription({
            start: "2026-10-20T07:12:05",
            end: "2026-11-20T07:12:05",
            status: "canceled",
          }),
          now: utc("2026-10-21T00:00:00"),
        }),
      ).toBe(null);
    });
  });

  describe("reset-usage cron", () => {
    it("catches up free organizations after missed runs, once", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      try {
        vi.setSystemTime(utc("2026-10-22T12:05:00"));
        const id = await createOrganization({
          totalPages: 30,
          deletedPages: 20,
          searchUsage: 9,
          billingCycleStart: 15,
          // the period that ended Sep 15 was never rolled over
          billingPeriodStart: utc("2026-08-15T12:00:00"),
          billingPeriodEnd: utc("2026-09-15T12:00:00"),
        });

        await runCron();
        await runCron();

        expect(await getOrganization(id)).toMatchObject({
          totalPages: 10,
          deletedPages: 0,
          searchUsage: 0,
          billingPeriodStart: utc("2026-10-15T12:00:00"),
          billingPeriodEnd: utc("2026-11-15T12:00:00"),
        });
      } finally {
        vi.useRealTimers();
      }
    });

    it("processes every due organization across pages", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      try {
        vi.setSystemTime(utc("2026-10-22T12:05:00"));
        await db.organization.createMany({
          data: Array.from({ length: 250 }, (_, i) => {
            const id = `${ORG_PREFIX}bulk_${String(i).padStart(3, "0")}`;
            return {
              id,
              name: id,
              slug: id,
              billingCycleStart: 20,
              billingPeriodStart: utc("2026-09-20T12:00:00"),
              billingPeriodEnd: utc("2026-10-20T12:00:00"),
            };
          }),
        });

        await runCron();

        expect(
          await db.organization.count({
            where: {
              id: { startsWith: `${ORG_PREFIX}bulk_` },
              billingPeriodStart: utc("2026-10-20T12:00:00"),
            },
          }),
        ).toBe(250);
      } finally {
        vi.useRealTimers();
      }
    }, 30_000);

    it("initializes organizations without a period", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      try {
        vi.setSystemTime(utc("2026-10-22T12:05:00"));
        const id = await createOrganization({
          billingCycleStart: null,
          createdAt: utc("2026-06-30T18:00:00"),
          usageLastChecked: utc("2026-10-22T12:00:30"),
        });

        await runCron();

        expect(await getOrganization(id)).toMatchObject({
          billingPeriodStart: utc("2026-09-30T12:00:00"),
          billingPeriodEnd: utc("2026-10-30T12:00:00"),
        });
      } finally {
        vi.useRealTimers();
      }
    });

    it("rolls paid organizations over from Stripe and re-meters", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      try {
        vi.setSystemTime(utc("2026-10-20T12:05:00"));
        const id = await createOrganization({
          plan: "pro",
          stripeId: "cus_1",
          totalPages: 30,
          deletedPages: 20,
          billingPeriodStart: SEP.start,
          billingPeriodEnd: SEP.end,
          meteredPeriodStart: SEP.start,
        });
        getLiveSubscription.mockResolvedValue(
          subscription({
            start: "2026-10-20T07:12:05",
            end: "2026-11-20T07:12:05",
          }),
        );

        await runCron();

        expect(await getOrganization(id)).toMatchObject({
          totalPages: 10,
          deletedPages: 0,
          billingPeriodStart: OCT.start,
          meteredPeriodStart: OCT.start,
        });
        expect(triggerMeterOrgDocuments).toHaveBeenCalledOnce();
      } finally {
        vi.useRealTimers();
      }
    });

    it("waits for Stripe to renew, then falls back to calendar periods", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      try {
        vi.setSystemTime(utc("2026-10-20T08:05:00"));
        const id = await createOrganization({
          plan: "pro",
          stripeId: "cus_1",
          totalPages: 30,
          deletedPages: 20,
          billingCycleStart: 20,
          billingPeriodStart: SEP.start,
          billingPeriodEnd: SEP.end,
        });
        getLiveSubscription.mockResolvedValue(
          subscription({
            start: "2026-09-20T07:12:05",
            end: "2026-10-20T07:12:05",
          }),
        );

        await runCron();
        expect((await getOrganization(id)).deletedPages).toBe(20);

        vi.setSystemTime(utc("2026-10-21T08:05:00"));
        await runCron();
        expect(await getOrganization(id)).toMatchObject({
          deletedPages: 0,
          billingPeriodStart: OCT.start,
          billingPeriodEnd: OCT.end,
        });
      } finally {
        vi.useRealTimers();
      }
    });

    it("keeps going when an organization fails, and reports it", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      try {
        vi.setSystemTime(utc("2026-10-22T12:05:00"));
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        await createOrganization({
          plan: "pro",
          stripeId: "cus_broken",
          billingPeriodStart: SEP.start,
          billingPeriodEnd: SEP.end,
        });
        const free = await createOrganization({
          deletedPages: 5,
          totalPages: 5,
          billingCycleStart: 20,
          billingPeriodStart: utc("2026-09-20T12:00:00"),
          billingPeriodEnd: utc("2026-10-20T12:00:00"),
        });
        getLiveSubscription.mockRejectedValue(new Error("Stripe is down"));

        await expect(runCron()).rejects.toThrow(
          "Failed to roll over 1 organizations",
        );
        expect((await getOrganization(free)).deletedPages).toBe(0);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
