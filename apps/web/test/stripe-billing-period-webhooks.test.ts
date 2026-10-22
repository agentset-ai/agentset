import { afterEach, describe, expect, it, vi } from "vitest";

const MOCKED = [
  "@/lib/log",
  "next/cache",
  "@vercel/functions",
  "@agentset/db/client",
  "@agentset/emails",
  "@agentset/jobs/billing-period",
  "@agentset/stripe",
  "@agentset/stripe/plans",
  "@agentset/webhooks/server",
  "@/app/api/(internal-api)/stripe/webhook/utils",
];

afterEach(() => {
  vi.restoreAllMocks();
  for (const path of MOCKED) vi.doUnmock(path);
});

const invoiceEvent = (invoice: Record<string, unknown>) => ({
  id: "evt_1",
  type: "invoice.paid",
  data: { object: { customer: "cus_1", ...invoice } },
});

const loadInvoiceHandler = async (
  organization: { id: string; plan: string } | null,
) => {
  vi.resetModules();
  const syncOrganizationBillingPeriod = vi.fn(() => Promise.resolve());

  vi.doMock("@agentset/db/client", () => ({
    db: {
      organization: { findUnique: vi.fn(() => Promise.resolve(organization)) },
    },
  }));
  vi.doMock("@agentset/stripe/plans", () => ({
    isFreePlan: (plan: string) => plan === "free",
  }));
  vi.doMock("@/app/api/(internal-api)/stripe/webhook/utils", () => ({
    syncOrganizationBillingPeriod,
  }));

  const { invoicePaymentSucceeded } =
    await import("@/app/api/(internal-api)/stripe/webhook/invoice-payment-succeeded");
  return { invoicePaymentSucceeded, syncOrganizationBillingPeriod };
};

describe("invoice.paid", () => {
  it.each(["subscription_cycle", "subscription_update", "subscription_create"])(
    "syncs the billing period of %s invoices",
    async (billing_reason) => {
      const { invoicePaymentSucceeded, syncOrganizationBillingPeriod } =
        await loadInvoiceHandler({ id: "org_1", plan: "pro" });

      await invoicePaymentSucceeded(
        invoiceEvent({ billing_reason, subscription: "sub_1" }) as never,
      );

      expect(syncOrganizationBillingPeriod).toHaveBeenCalledExactlyOnceWith({
        organizationId: "org_1",
        subscription: "sub_1",
      });
    },
  );

  it("reads the subscription of basil invoices", async () => {
    const { invoicePaymentSucceeded, syncOrganizationBillingPeriod } =
      await loadInvoiceHandler({ id: "org_1", plan: "pro" });

    await invoicePaymentSucceeded(
      invoiceEvent({
        billing_reason: "subscription_cycle",
        parent: { subscription_details: { subscription: "sub_2" } },
      }) as never,
    );

    expect(syncOrganizationBillingPeriod).toHaveBeenCalledWith({
      organizationId: "org_1",
      subscription: "sub_2",
    });
  });

  it.each<
    [string, Record<string, unknown>, { id: string; plan: string } | null]
  >([
    [
      "one-off invoices",
      { billing_reason: "manual" },
      { id: "org_1", plan: "pro" },
    ],
    ["unknown customers", { subscription: "sub_1" }, null],
    [
      "free organizations",
      { subscription: "sub_1" },
      { id: "org_1", plan: "free" },
    ],
  ])("ignores %s", async (_, invoice, organization) => {
    const { invoicePaymentSucceeded, syncOrganizationBillingPeriod } =
      await loadInvoiceHandler(organization);

    await invoicePaymentSucceeded(invoiceEvent(invoice) as never);

    expect(syncOrganizationBillingPeriod).not.toHaveBeenCalled();
  });
});

describe("syncOrganizationBillingPeriod", () => {
  const loadUtils = async (change: string | null) => {
    vi.resetModules();
    const revalidateTag = vi.fn();
    const subscription = { id: "sub_1" };
    const retrieve = vi.fn(() => Promise.resolve(subscription));
    const syncSubscriptionBillingPeriod = vi.fn(() => Promise.resolve(change));
    const db = {
      organizationApiKey: { findMany: vi.fn(() => Promise.resolve([])) },
    };

    vi.doMock("next/cache", () => ({ revalidateTag }));
    vi.doMock("@vercel/functions", () => ({
      waitUntil: (promise: Promise<unknown>) => promise,
    }));
    vi.doMock("@/lib/log", () => ({ log: vi.fn() }));
    vi.doMock("@agentset/db/client", () => ({ db }));
    vi.doMock("@agentset/emails", () => ({ sendEmail: vi.fn() }));
    vi.doMock("@agentset/jobs/billing-period", () => ({
      syncSubscriptionBillingPeriod,
    }));
    vi.doMock("@agentset/stripe", () => ({
      stripe: { subscriptions: { retrieve } },
      parseEnterprisePlanMetadata: vi.fn(),
      planToOrganizationFields: vi.fn(),
    }));
    vi.doMock("@agentset/stripe/plans", () => ({
      getPlanFromPriceId: vi.fn(),
    }));
    vi.doMock("@agentset/webhooks/server", () => ({ webhookCache: {} }));

    const { syncOrganizationBillingPeriod } =
      await import("@/app/api/(internal-api)/stripe/webhook/utils");
    return {
      syncOrganizationBillingPeriod,
      syncSubscriptionBillingPeriod,
      retrieve,
      revalidateTag,
      db,
      subscription,
    };
  };

  it("reads the latest subscription and revalidates after a change", async () => {
    const {
      syncOrganizationBillingPeriod,
      syncSubscriptionBillingPeriod,
      retrieve,
      revalidateTag,
      db,
      subscription,
    } = await loadUtils("rolled-over");

    await syncOrganizationBillingPeriod({
      organizationId: "org_1",
      subscription: "sub_1",
    });

    expect(retrieve).toHaveBeenCalledWith("sub_1");
    expect(syncSubscriptionBillingPeriod).toHaveBeenCalledWith(db, {
      organizationId: "org_1",
      subscription,
    });
    await vi.waitFor(() =>
      expect(revalidateTag).toHaveBeenCalledWith("org:org_1", "max"),
    );
  });

  it("uses a given subscription and skips revalidating when unchanged", async () => {
    const { syncOrganizationBillingPeriod, retrieve, revalidateTag } =
      await loadUtils("unchanged");

    await syncOrganizationBillingPeriod({
      organizationId: "org_1",
      subscription: { id: "sub_1" } as never,
    });

    expect(retrieve).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
