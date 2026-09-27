import type * as TriggerSdk from "@trigger.dev/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  trigger: vi.fn(),
  batchTrigger: vi.fn(),
  storeWebhookEventPayload: vi.fn(),
}));

vi.mock("@trigger.dev/sdk", async (importOriginal) => ({
  ...(await importOriginal<typeof TriggerSdk>()),
  tasks: { trigger: mocks.trigger, batchTrigger: mocks.batchTrigger },
}));

vi.mock("@agentset/webhooks/event-store", () => ({
  storeWebhookEventPayload: mocks.storeWebhookEventPayload,
}));

vi.mock("@agentset/stripe/plans", () => ({
  isEnterprisePlan: (plan: string) => plan === "enterprise",
  isProPlan: (plan: string) => plan === "pro",
}));

const importJobs = async (region: "us" | "eu") => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);
  return import("@agentset/jobs");
};

type Jobs = Awaited<ReturnType<typeof importJobs>>;

const INGEST_JOB = {
  id: "job_1",
  config: { metadata: { key: "value" } },
  namespace: {
    id: "ns_1",
    embeddingConfig: null,
    vectorStoreConfig: {
      provider: "TURBOPUFFER" as const,
      apiKey: "key",
      region: "aws-eu-central-1" as const,
    },
    organization: { id: "org_1", plan: "pro", stripeId: "stripe_1" },
  },
};

const webhookBody = (webhookId: string, eventId = "evt_1") => ({
  webhookId,
  eventId,
  event: "document.ready" as const,
  url: `https://hooks.example.com/${webhookId}`,
  secret: "s",
  payload: {
    id: eventId,
    event: "document.ready",
    createdAt: "2026-01-01T00:00:00.000Z",
    data: { id: "doc_1", name: "doc.pdf" },
  },
});

// Every helper that triggers a run from outside a task
const triggerAll = async (jobs: Jobs) => {
  await jobs.triggerIngestionJob(
    { jobId: "job_1", organizationId: "org_1" },
    "pro",
  );
  await jobs.triggerSeedDemoNamespace(
    { namespaceId: "ns_1", organizationId: "org_1", templateId: "t_1" },
    "free",
  );
  await jobs.triggerDeleteDocument({ documentId: "doc_1" });
  await jobs.triggerDeleteIngestJob({ jobId: "job_1" });
  await jobs.triggerDeleteNamespace({ namespaceId: "ns_1" });
  await jobs.triggerDeleteOrganization({ organizationId: "org_1" });
  await jobs.triggerMeterOrgDocuments({ organizationId: "org_1" });
  await jobs.triggerMeterOrgDocumentsBatch([
    { organizationId: "org_1" },
    { organizationId: "org_2" },
  ]);
  await jobs.triggerReIngestJob({ jobId: "job_1" }, "enterprise");
  await jobs.triggerSendWebhook(webhookBody("wh_1"));
  await jobs.triggerSendWebhook([webhookBody("wh_1"), webhookBody("wh_2")]);
};

const allTriggerOptions = () => [
  ...mocks.trigger.mock.calls.map((call) => call[2] as Record<string, unknown>),
  ...mocks.batchTrigger.mock.calls.flatMap((call) =>
    (call[1] as { options: Record<string, unknown> }[]).map((i) => i.options),
  ),
];

beforeEach(() => {
  mocks.trigger.mockResolvedValue({ id: "run_1" });
  mocks.batchTrigger.mockResolvedValue({ batchId: "batch_1" });
  mocks.storeWebhookEventPayload.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("trigger region", () => {
  it("passes no region option on us", async () => {
    const jobs = await importJobs("us");
    await triggerAll(jobs);

    expect(jobs.triggerRegionOptions).toEqual({});
    const options = allTriggerOptions();
    expect(options).toHaveLength(13);
    for (const option of options) {
      expect(option).not.toHaveProperty("region");
    }
  });

  it("keeps the us trigger options unchanged", async () => {
    const jobs = await importJobs("us");
    await jobs.triggerIngestionJob(
      { jobId: "job_1", organizationId: "org_1" },
      "pro",
    );

    expect(mocks.trigger).toHaveBeenCalledWith(
      "trigger-ingestion-job",
      { jobId: "job_1", organizationId: "org_1" },
      { tags: ["job_job_1"], priority: 3600 * 24 },
    );
  });

  it("runs every triggered task in the eu region on eu", async () => {
    const jobs = await importJobs("eu");
    await triggerAll(jobs);

    expect(jobs.triggerRegionOptions).toEqual({ region: "eu-central-1" });
    const options = allTriggerOptions();
    expect(options).toHaveLength(13);
    for (const option of options) {
      expect(option.region).toBe("eu-central-1");
    }
  });
});

describe("document job payload", () => {
  it("keeps the us payload", async () => {
    const { getDocumentJobPayload } = await importJobs("us");

    const payload = getDocumentJobPayload({
      documentId: "doc_1",
      ingestJob: INGEST_JOB,
    });
    expect(payload).toStrictEqual({
      documentId: "doc_1",
      ingestJob: INGEST_JOB,
    });
    expect((payload as { ingestJob: unknown }).ingestJob).toBe(INGEST_JOB);
    expect(
      getDocumentJobPayload({
        documentId: "doc_1",
        ingestJob: INGEST_JOB,
        cleanup: true,
      }),
    ).toStrictEqual({
      documentId: "doc_1",
      ingestJob: INGEST_JOB,
      cleanup: true,
    });
  });

  it("carries only ids and flags on eu", async () => {
    const { getDocumentJobPayload } = await importJobs("eu");

    expect(
      getDocumentJobPayload({ documentId: "doc_1", ingestJob: INGEST_JOB }),
    ).toStrictEqual({ documentId: "doc_1", ingestJobId: "job_1" });

    const payload = getDocumentJobPayload({
      documentId: "doc_1",
      ingestJob: INGEST_JOB,
      cleanup: true,
    });
    expect(payload).toStrictEqual({
      documentId: "doc_1",
      ingestJobId: "job_1",
      cleanup: true,
    });
  });

  it("accepts only the full payload on us", async () => {
    const { triggerDocumentJobBodySchema } = await importJobs("us");

    expect(
      triggerDocumentJobBodySchema.parse({
        documentId: "doc_1",
        ingestJob: INGEST_JOB,
      }),
    ).toStrictEqual({ documentId: "doc_1", ingestJob: INGEST_JOB });
    expect(
      triggerDocumentJobBodySchema.safeParse({
        documentId: "doc_1",
        ingestJobId: "job_1",
      }).success,
    ).toBe(false);
  });

  it("accepts both payload shapes on eu", async () => {
    const { triggerDocumentJobBodySchema } = await importJobs("eu");

    expect(
      triggerDocumentJobBodySchema.parse({
        documentId: "doc_1",
        ingestJobId: "job_1",
        cleanup: true,
      }),
    ).toStrictEqual({
      documentId: "doc_1",
      ingestJobId: "job_1",
      cleanup: true,
    });

    const parsed = triggerDocumentJobBodySchema.parse({
      documentId: "doc_1",
      ingestJob: { ...INGEST_JOB, payload: { type: "TEXT", text: "body" } },
    });
    expect(parsed).toStrictEqual({
      documentId: "doc_1",
      ingestJob: INGEST_JOB,
    });
    expect(Object.keys(parsed)).toEqual(["documentId", "ingestJob"]);
  });
});

describe("send webhook payload", () => {
  it("sends the full delivery on us without storing it", async () => {
    const jobs = await importJobs("us");
    const body = webhookBody("wh_1");
    await jobs.triggerSendWebhook(body);

    expect(mocks.storeWebhookEventPayload).not.toHaveBeenCalled();
    expect(mocks.trigger).toHaveBeenCalledWith("send-webhook", body, {
      tags: ["webhook_wh_1", "event_evt_1"],
      idempotencyKey: "evt_1",
    });
  });

  it("batches the full deliveries on us", async () => {
    const jobs = await importJobs("us");
    const bodies = [webhookBody("wh_1"), webhookBody("wh_2")];
    await jobs.triggerSendWebhook(bodies);

    expect(mocks.batchTrigger).toHaveBeenCalledWith("send-webhook", [
      {
        payload: bodies[0],
        options: {
          tags: ["webhook_wh_1", "event_evt_1"],
          idempotencyKey: "evt_1",
        },
      },
      {
        payload: bodies[1],
        options: {
          tags: ["webhook_wh_2", "event_evt_1"],
          idempotencyKey: "evt_1",
        },
      },
    ]);
  });

  it("stores the event and sends only ids on eu", async () => {
    const jobs = await importJobs("eu");
    const body = webhookBody("wh_1");
    await jobs.triggerSendWebhook(body);

    expect(mocks.storeWebhookEventPayload).toHaveBeenCalledExactlyOnceWith(
      "evt_1",
      body.payload,
    );
    expect(mocks.trigger).toHaveBeenCalledWith(
      "send-webhook",
      { webhookId: "wh_1", eventId: "evt_1" },
      {
        tags: ["webhook_wh_1", "event_evt_1"],
        idempotencyKey: "evt_1",
        region: "eu-central-1",
      },
    );
  });

  it("stores each event once for a batch on eu", async () => {
    const jobs = await importJobs("eu");
    await jobs.triggerSendWebhook([
      webhookBody("wh_1"),
      webhookBody("wh_2"),
      webhookBody("wh_1", "evt_2"),
    ]);

    expect(mocks.storeWebhookEventPayload).toHaveBeenCalledTimes(2);
    expect(
      mocks.storeWebhookEventPayload.mock.calls.map((c) => c[0] as string),
    ).toEqual(["evt_1", "evt_2"]);

    const items = mocks.batchTrigger.mock.calls[0]![1] as {
      payload: unknown;
    }[];
    expect(items.map((i) => i.payload)).toStrictEqual([
      { webhookId: "wh_1", eventId: "evt_1" },
      { webhookId: "wh_2", eventId: "evt_1" },
      { webhookId: "wh_1", eventId: "evt_2" },
    ]);
  });

  it("stores the event before triggering on eu", async () => {
    const jobs = await importJobs("eu");
    mocks.storeWebhookEventPayload.mockRejectedValueOnce(new Error("down"));

    await expect(jobs.triggerSendWebhook(webhookBody("wh_1"))).rejects.toThrow(
      "down",
    );
    expect(mocks.trigger).not.toHaveBeenCalled();
  });

  it("accepts only full deliveries on us", async () => {
    const { sendWebhookBodySchema, sendWebhookInlineBodySchema } =
      await importJobs("us");
    const body = webhookBody("wh_1");

    expect(sendWebhookBodySchema).toBe(sendWebhookInlineBodySchema);
    expect(sendWebhookBodySchema.parse(body)).toStrictEqual(body);
    expect(
      sendWebhookBodySchema.safeParse({ webhookId: "wh_1", eventId: "evt_1" })
        .success,
    ).toBe(false);
    expect(
      sendWebhookBodySchema.safeParse({ ...body, event: "unknown" }).success,
    ).toBe(false);
  });

  it("accepts both payload shapes on eu", async () => {
    const { sendWebhookBodySchema, sendWebhookInlineBodySchema } =
      await importJobs("eu");
    const body = webhookBody("wh_1");

    expect(sendWebhookBodySchema.parse(body)).toStrictEqual(
      sendWebhookInlineBodySchema.parse(body),
    );
    expect(
      sendWebhookBodySchema.parse({ webhookId: "wh_1", eventId: "evt_1" }),
    ).toStrictEqual({ webhookId: "wh_1", eventId: "evt_1" });
  });

  it("rejects malformed full deliveries on eu", async () => {
    const { sendWebhookBodySchema } = await importJobs("eu");
    const { secret: _secret, ...withoutSecret } = webhookBody("wh_1");

    for (const body of [
      { ...webhookBody("wh_1"), event: "unknown" },
      withoutSecret,
    ]) {
      expect(sendWebhookBodySchema.safeParse(body).success).toBe(false);
    }
  });
});
