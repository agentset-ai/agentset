import { afterEach, describe, expect, it, vi } from "vitest";

type Region = "us" | "eu";

const event = (
  type: string,
  object: Record<string, unknown>,
  id = "evt_1",
) => ({ id, type, data: { object } });

const checkoutEvent = (metadata?: Record<string, string>) =>
  event("checkout.session.completed", {
    object: "checkout.session",
    mode: "subscription",
    client_reference_id: "org_1",
    customer: "cus_1",
    subscription: "sub_1",
    metadata: metadata ?? {},
  });

const incompleteCheckoutEvent = (
  missing: "client_reference_id" | "customer",
  metadata?: Record<string, string>,
) => {
  const stripeEvent = checkoutEvent(metadata);
  return {
    ...stripeEvent,
    data: { object: { ...stripeEvent.data.object, [missing]: null } },
  };
};

const MISSING_ITEMS_ALERT = {
  message: "Missing items in Stripe webhook callback",
  type: "errors",
};

const MOCKED = [
  "@/env",
  "@/lib/log",
  "@/lib/bottleneck",
  "@/lib/constants",
  "@agentset/db",
  "@agentset/db/client",
  "@agentset/emails",
  "@agentset/jobs",
  "@agentset/stripe",
  "@agentset/stripe/plans",
  "@/app/api/(internal-api)/stripe/webhook/checkout-session-completed",
  "@/app/api/(internal-api)/stripe/webhook/customer-subscription-updated",
  "@/app/api/(internal-api)/stripe/webhook/customer-subscription-deleted",
  "@/app/api/(internal-api)/stripe/webhook/invoice-payment-failed",
  "@/app/api/(internal-api)/stripe/webhook/invoice-payment-succeeded",
  "@/app/api/(internal-api)/stripe/webhook/utils",
  "@/lib/auth",
  "@/lib/utils",
];

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  for (const path of MOCKED) vi.doUnmock(path);
});

describe("getStripeEventRegion", () => {
  const load = async () =>
    (await import("@/app/api/(internal-api)/stripe/webhook/region"))
      .getStripeEventRegion;

  it.each<[string, Record<string, unknown>, Region | undefined]>([
    [
      "an eu checkout session",
      { object: "checkout.session", metadata: { region: "eu" } },
      "eu",
    ],
    [
      "a us checkout session",
      { object: "checkout.session", metadata: { region: "us" } },
      "us",
    ],
    ["an untagged checkout session", { object: "checkout.session" }, undefined],
    [
      "an eu subscription",
      { object: "subscription", metadata: { region: "eu" } },
      "eu",
    ],
    [
      "an untagged subscription",
      { object: "subscription", metadata: {} },
      undefined,
    ],
    [
      "an eu invoice",
      {
        object: "invoice",
        parent: { subscription_details: { metadata: { region: "eu" } } },
      },
      "eu",
    ],
    [
      "an eu invoice in the older API shape",
      {
        object: "invoice",
        subscription_details: { metadata: { region: "eu" } },
      },
      "eu",
    ],
    [
      "an invoice without a subscription",
      { object: "invoice", parent: null },
      undefined,
    ],
    [
      "an unknown value",
      { object: "subscription", metadata: { region: "EU" } },
      undefined,
    ],
  ])("resolves %s", async (_label, object, region) => {
    const getStripeEventRegion = await load();

    expect(getStripeEventRegion(event("any", object) as never)).toBe(region);
  });
});

const loadWebhookRoute = async (
  region: Region,
  stripeEvent: object,
  checkoutError?: Error,
) => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);

  const handlers = {
    checkoutSessionCompleted: vi.fn(() =>
      checkoutError ? Promise.reject(checkoutError) : Promise.resolve(),
    ),
    customerSubscriptionUpdated: vi.fn(() => Promise.resolve()),
    customerSubscriptionDeleted: vi.fn(() => Promise.resolve()),
    invoicePaymentFailed: vi.fn(() => Promise.resolve()),
    invoicePaymentSucceeded: vi.fn(() => Promise.resolve()),
  };
  const log = vi.fn(() => Promise.resolve());

  vi.doMock("@/env", () => ({ env: { STRIPE_WEBHOOK_SECRET: "whsec_test" } }));
  vi.doMock("@/lib/log", () => ({ log }));
  vi.doMock("@agentset/stripe", () => ({
    stripe: { webhooks: { constructEvent: () => stripeEvent } },
  }));
  const dir = "@/app/api/(internal-api)/stripe/webhook";
  vi.doMock(`${dir}/checkout-session-completed`, () => ({
    checkoutSessionCompleted: handlers.checkoutSessionCompleted,
  }));
  vi.doMock(`${dir}/customer-subscription-updated`, () => ({
    customerSubscriptionUpdated: handlers.customerSubscriptionUpdated,
  }));
  vi.doMock(`${dir}/customer-subscription-deleted`, () => ({
    customerSubscriptionDeleted: handlers.customerSubscriptionDeleted,
  }));
  vi.doMock(`${dir}/invoice-payment-failed`, () => ({
    invoicePaymentFailed: handlers.invoicePaymentFailed,
  }));
  vi.doMock(`${dir}/invoice-payment-succeeded`, () => ({
    invoicePaymentSucceeded: handlers.invoicePaymentSucceeded,
  }));

  const { POST } =
    await import("@/app/api/(internal-api)/stripe/webhook/route");
  const res = await POST(
    new Request("https://app.example.com/api/stripe/webhook", {
      method: "POST",
      body: "{}",
      headers: { "Stripe-Signature": "sig" },
    }),
  );

  return { res: res!, handlers, log };
};

describe("stripe webhook route", () => {
  it.each<[Region, Record<string, string> | undefined]>([
    ["us", undefined],
    ["us", { region: "us" }],
    ["eu", undefined],
    ["eu", { region: "eu" }],
  ])("handles on %s events tagged %j", async (region, metadata) => {
    const { res, handlers } = await loadWebhookRoute(
      region,
      checkoutEvent(metadata),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(handlers.checkoutSessionCompleted).toHaveBeenCalledTimes(1);
  });

  it.each<[Region, Record<string, string> | undefined]>([
    ["us", { region: "eu" }],
    ["eu", { region: "us" }],
  ])("ignores on %s events tagged %j", async (region, metadata) => {
    const { res, handlers } = await loadWebhookRoute(
      region,
      checkoutEvent(metadata),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      received: true,
      ignored: "other region",
    });
    expect(handlers.checkoutSessionCompleted).not.toHaveBeenCalled();
  });

  it("ignores eu invoices on us before metering", async () => {
    const { res, handlers } = await loadWebhookRoute(
      "us",
      event("invoice.paid", {
        object: "invoice",
        parent: { subscription_details: { metadata: { region: "eu" } } },
      }),
    );

    expect(res.status).toBe(200);
    expect(handlers.invoicePaymentSucceeded).not.toHaveBeenCalled();
  });

  it("keeps the us failure alert", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { res, log } = await loadWebhookRoute(
      "us",
      checkoutEvent(),
      new Error("not found"),
    );

    expect(res.status).toBe(400);
    expect(log).toHaveBeenCalledWith({
      message: "Stripe webhook failed. Error: not found",
      type: "errors",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Stripe webhook failed. Error: not found",
    );
  });

  it("keeps error messages out of eu failure alerts and logs", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { res, log } = await loadWebhookRoute(
      "eu",
      checkoutEvent({ region: "eu" }),
      new Error("owner@example.com not found"),
    );

    expect(res.status).toBe(400);
    expect(log).toHaveBeenCalledWith({
      message:
        "Stripe webhook failed. Event: `evt_1` (`checkout.session.completed`). Error: Error",
      type: "errors",
    });
    expect(consoleError).toHaveBeenCalledWith("Stripe webhook failed", {
      error: { name: "Error" },
      context: { eventId: "evt_1", eventType: "checkout.session.completed" },
    });
    expect(
      JSON.stringify([log.mock.calls, consoleError.mock.calls]),
    ).not.toContain("owner@example.com");
  });
});

const loadCheckoutHandler = async (
  region: Region,
  organization: { id: string } | null,
) => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);

  const db = {
    organization: {
      findUnique: vi.fn(() => Promise.resolve(organization)),
      update: vi.fn(() =>
        Promise.resolve({
          slug: "acme",
          deletedPages: 0,
          members: [
            { user: { name: "m1", email: "m1" } },
            { user: { name: "m2", email: "m2" } },
          ],
        }),
      ),
      updateMany: vi.fn(),
    },
  };
  const log = vi.fn(() => Promise.resolve());
  const triggerMeterOrgDocuments = vi.fn(() => Promise.resolve());
  const plan = { name: "pro", features: [] };

  vi.doMock("@/lib/log", () => ({ log }));
  vi.doMock("@/lib/bottleneck", () => ({
    limiter: { schedule: (fn: () => unknown) => fn() },
  }));
  vi.doMock("@/lib/constants", () => ({ APP_DOMAIN: "https://app.test" }));
  vi.doMock("@agentset/db", () => ({ Prisma: {} }));
  vi.doMock("@agentset/db/client", () => ({ db }));
  vi.doMock("@agentset/emails", () => ({
    sendEmail: vi.fn(() => Promise.resolve()),
    UpgradeEmail: vi.fn(() => null),
  }));
  vi.doMock("@agentset/jobs", () => ({ triggerMeterOrgDocuments }));
  vi.doMock("@agentset/stripe", () => ({
    stripe: {
      subscriptions: {
        retrieve: vi.fn(() =>
          Promise.resolve({
            items: {
              data: [
                {
                  price: {
                    id: "price_pro",
                    recurring: { usage_type: "licensed", interval: "month" },
                  },
                },
              ],
            },
          }),
        ),
      },
    },
    parseEnterprisePlanMetadata: vi.fn(),
    planToOrganizationFields: () => ({ plan: "pro" }),
  }));
  vi.doMock("@agentset/stripe/plans", () => ({
    getPlanFromPriceId: () => plan,
  }));
  vi.doMock("@/app/api/(internal-api)/stripe/webhook/utils", () => ({
    revalidateOrganizationCache: vi.fn(),
  }));

  const { checkoutSessionCompleted } =
    await import("@/app/api/(internal-api)/stripe/webhook/checkout-session-completed");

  return { checkoutSessionCompleted, db, log, triggerMeterOrgDocuments };
};

describe("checkout.session.completed", () => {
  it.each<Region>(["us", "eu"])(
    "does nothing on %s when the organization isn't in this database",
    async (region) => {
      vi.spyOn(console, "log").mockImplementation(() => undefined);
      const { checkoutSessionCompleted, db, triggerMeterOrgDocuments } =
        await loadCheckoutHandler(region, null);

      await expect(
        checkoutSessionCompleted(checkoutEvent() as never),
      ).resolves.toBeUndefined();
      expect(db.organization.update).not.toHaveBeenCalled();
      expect(triggerMeterOrgDocuments).not.toHaveBeenCalled();
    },
  );

  it.each<[Region, Record<string, string> | undefined]>([
    ["us", undefined],
    ["us", { region: "us" }],
    ["eu", { region: "eu" }],
  ])(
    "reports missing items on %s for events tagged %j",
    async (region, metadata) => {
      const { checkoutSessionCompleted, db, log } = await loadCheckoutHandler(
        region,
        { id: "org_1" },
      );

      await checkoutSessionCompleted(
        incompleteCheckoutEvent("client_reference_id", metadata) as never,
      );

      expect(log).toHaveBeenCalledExactlyOnceWith(MISSING_ITEMS_ALERT);
      expect(db.organization.findUnique).not.toHaveBeenCalled();
    },
  );

  it.each(["client_reference_id", "customer"] as const)(
    "leaves untagged events without %s to the us deployment on eu",
    async (missing) => {
      const { checkoutSessionCompleted, db, log } = await loadCheckoutHandler(
        "eu",
        { id: "org_1" },
      );

      await expect(
        checkoutSessionCompleted(incompleteCheckoutEvent(missing) as never),
      ).resolves.toBeUndefined();
      expect(log).not.toHaveBeenCalled();
      expect(db.organization.findUnique).not.toHaveBeenCalled();
    },
  );

  it("keeps the us subscriber alert", async () => {
    const { checkoutSessionCompleted, db, log, triggerMeterOrgDocuments } =
      await loadCheckoutHandler("us", { id: "org_1" });

    await checkoutSessionCompleted(checkoutEvent() as never);

    expect(db.organization.update).toHaveBeenCalled();
    expect(triggerMeterOrgDocuments).toHaveBeenCalledWith({
      organizationId: "org_1",
    });
    expect(log).toHaveBeenCalledWith({
      message:
        "🎉 New Pro subscriber: \nPeriod: `monthly`\nOrganization: `acme`\nMembers: `m1, m2`",
      type: "subscribers",
    });
  });

  it("announces with the organization and member count only on eu", async () => {
    const { checkoutSessionCompleted, log, triggerMeterOrgDocuments } =
      await loadCheckoutHandler("eu", { id: "org_1" });

    await checkoutSessionCompleted(checkoutEvent({ region: "eu" }) as never);

    expect(triggerMeterOrgDocuments).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith({
      message:
        "🎉 New Pro subscriber:\nPeriod: `monthly`\nOrganization: `acme` (`org_1`)\nMembers: `2`",
      type: "subscribers",
    });
  });
});

describe("billing.upgrade checkout session", () => {
  const loadBilling = async (region: Region) => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);

    const createSession = vi.fn(() => Promise.resolve({ id: "cs_1" }));
    vi.doMock("@/lib/auth", () => ({ auth: {} }));
    vi.doMock("@/lib/utils", () => ({ getBaseUrl: () => "https://app.test" }));
    vi.doMock("@agentset/db/client", () => ({ db: {} }));
    vi.doMock("@agentset/stripe", () => ({
      stripe: {
        prices: {
          list: vi.fn(() => Promise.resolve({ data: [{ id: "price_pro" }] })),
        },
        checkout: { sessions: { create: createSession } },
      },
    }));
    vi.doMock("@agentset/stripe/plans", () => ({
      getStripeEnvironment: () => "test",
      isProPlan: () => false,
      PRO_PLAN_METERED: {},
    }));

    const { billingRouter } = await import("@/server/api/routers/billing");
    const { createCallerFactory } = await import("@/server/api/trpc");
    const caller = createCallerFactory(billingRouter)({
      db: {
        organization: {
          findUnique: () =>
            Promise.resolve({ id: "org_1", slug: "acme", stripeId: null }),
        },
      },
      session: { user: { id: "user_1", email: "owner@example.com" } },
      headers: new Headers(),
    } as never);

    return { caller, createSession };
  };

  it.each<Region>(["us", "eu"])(
    "tags %s checkout sessions and subscriptions with the region",
    async (region) => {
      const { caller, createSession } = await loadBilling(region);

      await caller.upgrade({
        orgId: "org_1",
        plan: "free",
        period: "monthly",
        baseUrl: "https://app.test/acme/billing",
      });

      expect(createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          client_reference_id: "org_1",
          metadata: { agentsetCustomerId: "user_1", region },
          subscription_data: { metadata: { region } },
        }),
      );
    },
  );
});
