import type * as TriggerSdk from "@trigger.dev/sdk";
import { afterEach, describe, expect, it, vi } from "vitest";

import { importForRegion } from "./helpers/region";

const mocks = vi.hoisted(() => ({
  emitDocumentWebhook: vi.fn(),
  emitIngestJobWebhook: vi.fn(),
  db: {
    document: {
      update: vi.fn(({ data }: { data: { error: string } }) =>
        Promise.resolve({
          id: "doc_1",
          namespaceId: "ns_1",
          error: data.error,
        }),
      ),
    },
    ingestJob: {
      update: vi.fn(({ data }: { data: { error: string } }) =>
        Promise.resolve({
          id: "job_1",
          namespaceId: "ns_1",
          error: data.error,
        }),
      ),
    },
    namespace: {
      findUniqueOrThrow: vi.fn(() =>
        Promise.resolve({ organizationId: "org_1" }),
      ),
    },
  },
}));

vi.mock("@trigger.dev/sdk", async (importOriginal) => ({
  ...(await importOriginal<typeof TriggerSdk>()),
  schemaTask: (definition: unknown) => definition,
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../../../packages/jobs/src/db", () => ({ getDb: () => mocks.db }));
vi.mock("../../../packages/jobs/src/redis", () => ({
  redis: { get: vi.fn(), del: vi.fn() },
}));
vi.mock("../../../packages/jobs/src/rate-limit", () => ({
  rateLimit: vi.fn(),
}));
vi.mock("../../../packages/jobs/src/webhook", () => ({
  emitBulkDocumentWebhooks: vi.fn(),
  emitDocumentWebhook: mocks.emitDocumentWebhook,
  emitIngestJobWebhook: mocks.emitIngestJobWebhook,
}));

vi.mock("@agentset/engine", () => ({}));
vi.mock("@agentset/engine/env", () => ({ env: {} }));
vi.mock("@agentset/storage", () => ({}));
vi.mock("@agentset/stripe", () => ({}));
vi.mock("@agentset/stripe/plans", () => ({
  isEnterprisePlan: () => false,
  isFreePlan: () => false,
  isProPlan: () => false,
}));

type FailureHook = (params: {
  payload: Record<string, unknown>;
  error: unknown;
}) => Promise<void>;

const FAILED_MESSAGE =
  "Processing failed. Please try again, or contact support if it keeps happening.";

const contentError = () =>
  Object.assign(new Error("Invalid input: chunk text from the document"), {
    name: "APICallError",
    status: 400,
  });

const importTasks = async (region: "us" | "eu") => {
  const [{ processDocument }, { ingestJob }, { reIngestJob }, errors] =
    await importForRegion(region, () =>
      Promise.all([
        import("../../../packages/jobs/src/tasks/process-document"),
        import("../../../packages/jobs/src/tasks/ingest"),
        import("../../../packages/jobs/src/tasks/re-ingest"),
        import("../../../packages/jobs/src/errors"),
      ]),
    );

  const onFailure = (task: unknown) =>
    (task as { onFailure: FailureHook }).onFailure;

  return {
    processDocument: onFailure(processDocument),
    ingestJob: onFailure(ingestJob),
    reIngestJob: onFailure(reIngestJob),
    // on EU the hooks receive the error the sanitized run threw
    runError: (error: Error, context: Record<string, string>) =>
      region === "eu" ? errors.sanitizeTaskError(error, context) : error,
  };
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

// US jobs carry the ingest job inline; EU jobs carry its ID
const DOCUMENT_PAYLOADS = {
  us: {
    documentId: "doc_1",
    ingestJob: { namespace: { organization: { id: "org_1" } } },
  },
  eu: { documentId: "doc_1", ingestJobId: "job_1" },
};

describe.each([
  ["us", "Invalid input: chunk text from the document"],
  ["eu", FAILED_MESSAGE],
] as const)("task failure messages on %s", (region, expected) => {
  it("stores the message on the document and its error webhook", async () => {
    const { processDocument, runError } = await importTasks(region);

    await processDocument({
      payload: DOCUMENT_PAYLOADS[region],
      error: runError(contentError(), { documentId: "doc_1" }),
    });

    expect(mocks.db.document.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ error: expected }),
      }),
    );
    expect(mocks.emitDocumentWebhook).toHaveBeenCalledWith({
      trigger: "document.error",
      document: expect.objectContaining({
        error: expected,
        organizationId: "org_1",
      }),
    });
  });

  it("stores the message on the ingest job and its error webhook", async () => {
    const { ingestJob, runError } = await importTasks(region);

    await ingestJob({
      payload: { jobId: "job_1", organizationId: "org_1" },
      error: runError(contentError(), { jobId: "job_1" }),
    });

    expect(mocks.db.ingestJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ error: expected }),
      }),
    );
    expect(mocks.emitIngestJobWebhook).toHaveBeenCalledWith({
      trigger: "ingest_job.error",
      ingestJob: expect.objectContaining({ error: expected }),
    });
  });

  it("stores the message on the re-ingested job", async () => {
    const { reIngestJob, runError } = await importTasks(region);

    await reIngestJob({
      payload: { jobId: "job_1" },
      error: runError(contentError(), { jobId: "job_1" }),
    });

    expect(mocks.db.ingestJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ error: expected }),
      }),
    );
  });

  it("keeps the fixed partition error message", async () => {
    const { processDocument, runError } = await importTasks(region);

    await processDocument({
      payload: DOCUMENT_PAYLOADS[region],
      error: runError(new Error("Partition Error"), { documentId: "doc_1" }),
    });

    expect(mocks.db.document.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ error: "Partition Error" }),
      }),
    );
  });
});
