import { afterEach, describe, expect, it, vi } from "vitest";

const MOCKED_MODULES = [
  "@agentset/db/client",
  "@agentset/jobs",
  "@agentset/storage",
  "@/lib/webhook/emit",
  "@/services/uploads",
  "@vercel/functions",
];

const loadCreateIngestJob = async (region: "us" | "eu" | undefined) => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);

  const job = { id: "job_1", namespaceId: "ns_1" };
  const db = {
    $transaction: vi.fn(() => Promise.resolve([job, { id: "ns_1" }])),
    ingestJob: {
      create: vi.fn(() => job),
      update: vi.fn(() => Promise.resolve({ id: job.id })),
    },
    namespace: { update: vi.fn(() => ({ id: "ns_1" })) },
  };
  const triggerIngestionJob = vi.fn(() => Promise.resolve({ id: "run_1" }));

  vi.doMock("@agentset/db/client", () => ({ db }));
  vi.doMock("@agentset/jobs", () => ({ triggerIngestionJob }));
  vi.doMock("@agentset/storage", () => ({
    checkFileExists: vi.fn(() => Promise.resolve(true)),
  }));
  vi.doMock("@/lib/webhook/emit", () => ({
    emitIngestJobWebhook: vi.fn(() => Promise.resolve()),
  }));
  vi.doMock("@/services/uploads", () => ({
    validateNamespaceFileKey: vi.fn(() => true),
  }));
  vi.doMock("@vercel/functions", () => ({ waitUntil: vi.fn() }));

  const { createIngestJob } = await import("@/services/ingest-jobs/create");
  const { AgentsetApiError } = await import("@/lib/api/errors");

  return { createIngestJob, AgentsetApiError, db, triggerIngestionJob };
};

afterEach(() => {
  vi.unstubAllEnvs();
  for (const name of MOCKED_MODULES) vi.doUnmock(name);
});

const baseArgs = {
  plan: "free",
  organizationId: "org_1",
  namespaceId: "ns_1",
};

const crawlPayload = { type: "CRAWL" as const, url: "https://example.com" };
const youtubePayload = {
  type: "YOUTUBE" as const,
  urls: ["https://www.youtube.com/watch?v=abc"],
};
const textPayload = { type: "TEXT" as const, text: "Hello world" };

const makeData = (
  payload: typeof crawlPayload | typeof youtubePayload | typeof textPayload,
) => ({ payload, externalId: null });

describe("createIngestJob on eu", () => {
  it("rejects youtube jobs before creating them", async () => {
    const { createIngestJob, AgentsetApiError, db, triggerIngestionJob } =
      await loadCreateIngestJob("eu");

    const error = await createIngestJob({
      ...baseArgs,
      data: makeData(youtubePayload),
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AgentsetApiError);
    expect(error).toMatchObject({
      code: "bad_request",
      message: "YouTube ingestion is not available in this region.",
    });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(triggerIngestionJob).not.toHaveBeenCalled();
  });

  it.each([
    ["text", textPayload],
    ["crawl", crawlPayload],
  ])("creates %s jobs", async (_label, payload) => {
    const { createIngestJob, db, triggerIngestionJob } =
      await loadCreateIngestJob("eu");

    await createIngestJob({ ...baseArgs, data: makeData(payload) });

    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(triggerIngestionJob).toHaveBeenCalledOnce();
  });
});

describe("createIngestJob on us", () => {
  it.each([
    ["crawl", crawlPayload],
    ["youtube", youtubePayload],
  ])("creates %s jobs", async (_label, payload) => {
    const { createIngestJob, db, triggerIngestionJob } =
      await loadCreateIngestJob(undefined);

    await createIngestJob({ ...baseArgs, data: makeData(payload) });

    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(triggerIngestionJob).toHaveBeenCalledOnce();
  });
});
