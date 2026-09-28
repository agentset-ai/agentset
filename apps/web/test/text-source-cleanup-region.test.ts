import type * as TriggerSdk from "@trigger.dev/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { importForRegion } from "./helpers/region";

const mocks = vi.hoisted(() => ({
  deletePartitionTextSource: vi.fn(() => Promise.resolve()),
  deleteObject: vi.fn(() => Promise.resolve()),
  serializePartitionBody: vi.fn((body: unknown) => JSON.stringify(body)),
  waitpointResult: { status: 500 } as { status: number } | undefined,
  waitpointError: undefined as Error | undefined,
  db: {
    document: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@trigger.dev/sdk", async (importOriginal) => ({
  ...(await importOriginal<typeof TriggerSdk>()),
  schemaTask: (definition: unknown) => definition,
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  wait: {
    createToken: vi.fn(() =>
      Promise.resolve({ id: "tok_1", publicAccessToken: "pat" }),
    ),
    forToken: vi.fn(() => ({
      unwrap: () =>
        mocks.waitpointError
          ? Promise.reject(mocks.waitpointError)
          : Promise.resolve(mocks.waitpointResult),
    })),
  },
}));

vi.mock("../../../packages/jobs/src/db", () => ({ getDb: () => mocks.db }));
vi.mock("../../../packages/jobs/src/redis", () => ({
  redis: { get: vi.fn(), del: vi.fn() },
}));
vi.mock("../../../packages/jobs/src/rate-limit", () => ({
  rateLimit: vi.fn(),
}));
vi.mock("../../../packages/jobs/src/webhook", () => ({
  emitDocumentWebhook: vi.fn(),
}));

vi.mock("@agentset/engine", () => ({
  deletePartitionTextSource: mocks.deletePartitionTextSource,
  getNamespaceEmbeddingModel: vi.fn(() => Promise.resolve({})),
  getNamespaceVectorStore: vi.fn(() =>
    Promise.resolve({
      deleteByFilter: vi.fn(() => Promise.resolve({ deleted: 0 })),
    }),
  ),
  getPartitionDocumentBody: vi.fn(() =>
    Promise.resolve({ extra_metadata: {} }),
  ),
  serializePartitionBody: mocks.serializePartitionBody,
}));
vi.mock("@agentset/engine/env", () => ({
  env: {
    PARTITION_API_URL: "https://partition.example.com",
    PARTITION_API_KEY: "key",
  },
}));
vi.mock("@agentset/storage", () => ({
  deleteDocumentChunksFile: vi.fn(),
  deleteDocumentImages: vi.fn(),
  deleteObject: mocks.deleteObject,
  getChunksJsonFromS3: vi.fn(),
}));
vi.mock("@agentset/stripe", () => ({ meterIngestedPages: vi.fn() }));
vi.mock("@agentset/stripe/plans", () => ({
  isEnterprisePlan: () => false,
  isFreePlan: () => false,
  isProPlan: () => false,
}));

type Source =
  | { type: "TEXT"; text: string }
  | { type: "MANAGED_FILE"; key: string };

const TEXT_SOURCE: Source = { type: "TEXT", text: "Some private text" };
const FILE_SOURCE: Source = { type: "MANAGED_FILE", key: "uploads/file.pdf" };

const makeDocument = (source: Source) => ({
  id: "doc_1",
  name: null,
  namespaceId: "ns_1",
  tenantId: null,
  status: "QUEUED",
  source,
  config: null,
  totalCharacters: 0,
  totalChunks: 0,
  totalPages: 0,
  completedAt: null,
  error: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  namespace: {
    id: "ns_1",
    vectorStoreConfig: null,
    organizationId: "org_1",
  },
});

const INGEST_JOB = {
  id: "job_1",
  config: null,
  namespace: {
    id: "ns_1",
    embeddingConfig: null,
    vectorStoreConfig: null,
    organization: { id: "org_1", plan: "pro", stripeId: null },
  },
};

type TaskDefinition = { run: (payload: unknown) => Promise<unknown> };

const importTasks = async (region: "us" | "eu") => {
  const [{ deleteDocument }, { processDocument }] = await importForRegion(
    region,
    () =>
      Promise.all([
        import("../../../packages/jobs/src/tasks/delete-document"),
        import("../../../packages/jobs/src/tasks/process-document"),
      ]),
  );

  return {
    deleteDocument: deleteDocument as unknown as TaskDefinition,
    processDocument: processDocument as unknown as TaskDefinition,
  };
};

beforeEach(() => {
  mocks.waitpointResult = { status: 500 };
  mocks.waitpointError = undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        status: 200,
        json: () => Promise.resolve({ call_id: "call_1" }),
      }),
    ),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("text source cleanup when processing", () => {
  const runWith = async (region: "us" | "eu", source: Source) => {
    const { processDocument } = await importTasks(region);
    mocks.db.document.update.mockResolvedValue(makeDocument(source));

    return processDocument.run({ documentId: "doc_1", ingestJob: INGEST_JOB });
  };

  it("keeps us text documents unchanged", async () => {
    await expect(runWith("us", TEXT_SOURCE)).rejects.toThrow("Partition Error");
    expect(mocks.deletePartitionTextSource).not.toHaveBeenCalled();
  });

  it("deletes the eu text source once partitioning finishes", async () => {
    await expect(runWith("eu", TEXT_SOURCE)).rejects.toThrow("Partition Error");
    expect(mocks.deletePartitionTextSource).toHaveBeenCalledExactlyOnceWith(
      "doc_1",
    );
  });

  it("still reports the partition result when the eu cleanup fails", async () => {
    mocks.deletePartitionTextSource.mockRejectedValueOnce(new Error("R2"));

    await expect(runWith("eu", TEXT_SOURCE)).rejects.toThrow("Partition Error");
  });

  it("leaves other eu sources alone", async () => {
    await expect(runWith("eu", FILE_SOURCE)).rejects.toThrow("Partition Error");
    expect(mocks.deletePartitionTextSource).not.toHaveBeenCalled();
  });

  const failures: [string, () => void][] = [
    [
      "the partition request is rejected",
      () => {
        vi.stubGlobal(
          "fetch",
          vi.fn(() =>
            Promise.resolve({ status: 503, json: () => Promise.resolve({}) }),
          ),
        );
      },
    ],
    [
      "the request body is too large",
      () => {
        mocks.serializePartitionBody.mockImplementationOnce(() => {
          throw new Error("Document metadata is too large");
        });
      },
    ],
    [
      "the partition result never arrives",
      () => {
        mocks.waitpointError = new Error("Timed out");
      },
    ],
  ];

  it.each(failures)(
    "deletes the eu text source when %s",
    async (_label, fail) => {
      fail();

      await expect(runWith("eu", TEXT_SOURCE)).rejects.toThrow();
      expect(mocks.deletePartitionTextSource).toHaveBeenCalledExactlyOnceWith(
        "doc_1",
      );
    },
  );

  it.each(failures)(
    "keeps us text documents unchanged when %s",
    async (_label, fail) => {
      fail();

      await expect(runWith("us", TEXT_SOURCE)).rejects.toThrow();
      expect(mocks.deletePartitionTextSource).not.toHaveBeenCalled();
    },
  );
});

describe("text source cleanup when deleting", () => {
  const runWith = async (region: "us" | "eu", source: Source) => {
    const { deleteDocument } = await importTasks(region);
    mocks.db.document.findUnique.mockResolvedValue(makeDocument(source));

    return deleteDocument.run({ documentId: "doc_1", skipWebhooks: true });
  };

  it("keeps us text documents unchanged", async () => {
    await expect(runWith("us", TEXT_SOURCE)).resolves.toMatchObject({
      deleted: true,
    });
    expect(mocks.deletePartitionTextSource).not.toHaveBeenCalled();
  });

  it("deletes the eu text source with the document", async () => {
    await expect(runWith("eu", TEXT_SOURCE)).resolves.toMatchObject({
      deleted: true,
    });
    expect(mocks.deletePartitionTextSource).toHaveBeenCalledExactlyOnceWith(
      "doc_1",
    );
  });

  it("deletes eu managed files as before", async () => {
    await runWith("eu", FILE_SOURCE);

    expect(mocks.deleteObject).toHaveBeenCalledExactlyOnceWith(
      "uploads/file.pdf",
    );
    expect(mocks.deletePartitionTextSource).not.toHaveBeenCalled();
  });
});
