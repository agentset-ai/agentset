import type { Transaction } from "@electric-sql/pglite";
import type * as TriggerSdk from "@trigger.dev/sdk";
import { PGlite } from "@electric-sql/pglite";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type * as Storage from "@agentset/storage";
import type { MetadataPatch } from "@agentset/validation";
import { Prisma } from "@agentset/db";

import { importForRegion } from "./helpers/region";

const mocks = vi.hoisted(() => ({
  db: undefined as unknown,
  updateVectorMetadata: vi.fn(),
  getChunks: vi.fn(),
  upload: vi.fn(),
  getStoredPatch: vi.fn(),
}));

vi.mock("@trigger.dev/sdk", async (importOriginal) => ({
  ...(await importOriginal<typeof TriggerSdk>()),
  schemaTask: (definition: unknown) => definition,
  logger: { info: vi.fn() },
}));
vi.mock("../../../packages/jobs/src/db", () => ({ getDb: () => mocks.db }));
vi.mock("../../../packages/jobs/src/metadata-store", () => ({
  getMetadataUpdatePatch: mocks.getStoredPatch,
  storeMetadataUpdatePatch: vi.fn(),
}));
vi.mock("@agentset/stripe/plans", () => ({
  isEnterprisePlan: (plan: string) => plan === "enterprise",
  isProPlan: (plan: string) => plan === "pro",
}));
vi.mock("@agentset/engine", () => ({
  getNamespaceVectorStore: () =>
    Promise.resolve({
      updateDocumentMetadata: mocks.updateVectorMetadata,
    }),
}));
vi.mock("@agentset/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof Storage>()),
  getChunksJsonFromS3: mocks.getChunks,
  uploadObject: mocks.upload,
}));

const pg = new PGlite();
type Executor = Pick<Transaction, "query">;

const transactionAdapter = (executor: Executor) => ({
  $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const sql = Prisma.sql(strings, ...values);
    return (await executor.query(sql.text, sql.values)).rows;
  },
  $executeRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const sql = Prisma.sql(strings, ...values);
    return (await executor.query(sql.text, sql.values)).affectedRows;
  },
  document: {
    findUniqueOrThrow: async ({ where }: { where: { id: string } }) => {
      const { rows } = await executor.query<{ config: object | null }>(
        "SELECT config FROM document WHERE id = $1",
        [where.id],
      );
      if (!rows[0]) throw new Error("Document not found");
      return rows[0];
    },
  },
});

const dbAdapter = () => ({
  $transaction: <T>(
    run: (transaction: ReturnType<typeof transactionAdapter>) => Promise<T>,
  ) => pg.transaction((transaction) => run(transactionAdapter(transaction))),
  namespace: {
    findUnique: async ({ where }: { where: { id: string } }) =>
      (
        await pg.query(
          'SELECT id, "vectorStoreConfig" FROM namespace WHERE id = $1',
          [where.id],
        )
      ).rows[0] ?? null,
  },
  document: {
    findFirst: async ({
      where,
    }: {
      where: {
        id: string;
        namespaceId: string;
        tenantId: string | null;
        ingestJobId?: { in: string[] };
      };
    }) =>
      (
        await pg.query(
          `
        SELECT "ingestJobId" FROM document
        WHERE id = $1 AND "namespaceId" = $2
          AND "tenantId" IS NOT DISTINCT FROM $3::text
          AND ($4::text[] IS NULL OR "ingestJobId" = ANY($4))
      `,
          [
            where.id,
            where.namespaceId,
            where.tenantId,
            where.ingestJobId?.in ?? null,
          ],
        )
      ).rows[0] ?? null,
  },
});

type Body = {
  namespaceId: string;
  tenantId: string | null;
  documentIds: string[];
  jobIds: string[];
} & ({ metadata: MetadataPatch } | { metadataRequestId: string });
type TaskDefinition = { run: (payload: Body) => Promise<unknown> };

const loadWorker = async (region: "us" | "eu" = "us") => {
  vi.stubEnv("SKIP_ENV_VALIDATION", "1");
  const { updateMetadata } = await importForRegion(
    region,
    () => import("../../../packages/jobs/src/tasks/update-metadata"),
  );
  return updateMetadata as unknown as TaskDefinition;
};

beforeAll(async () => {
  await pg.exec(`
    CREATE TABLE namespace (id text PRIMARY KEY, "vectorStoreConfig" jsonb);
    CREATE TABLE ingest_job (
      id text PRIMARY KEY, "namespaceId" text, "tenantId" text,
      status text, config jsonb, "updatedAt" timestamptz DEFAULT NOW()
    );
    CREATE TABLE document (
      id text PRIMARY KEY, "namespaceId" text, "tenantId" text,
      "ingestJobId" text, status text, config jsonb,
      "updatedAt" timestamptz DEFAULT NOW()
    );
    INSERT INTO namespace VALUES ('ns1', '{"provider":"MANAGED_TURBOPUFFER"}');
  `);
});

afterAll(async () => {
  await pg.close();
});
afterEach(() => {
  vi.unstubAllEnvs();
});
beforeEach(async () => {
  vi.clearAllMocks();
  await pg.exec("TRUNCATE document, ingest_job");
  mocks.db = dbAdapter();
  mocks.updateVectorMetadata.mockResolvedValue(undefined);
  mocks.getChunks.mockResolvedValue(null);
  mocks.upload.mockResolvedValue(undefined);
  mocks.getStoredPatch.mockResolvedValue(null);
});

const job = async (
  config: object | null = null,
  tenantId: string | null = null,
) => {
  await pg.query(
    `INSERT INTO ingest_job (id,"namespaceId","tenantId",status,config) VALUES ('job','ns1',$1,'COMPLETED',$2)`,
    [tenantId, config === null ? null : JSON.stringify(config)],
  );
};
const document = async (
  id = "doc",
  config: object | null = null,
  tenantId: string | null = null,
) => {
  await pg.query(
    `INSERT INTO document (id,"namespaceId","tenantId","ingestJobId",status,config) VALUES ($1,'ns1',$2,'job','COMPLETED',$3)`,
    [id, tenantId, config === null ? null : JSON.stringify(config)],
  );
};
const configFor = async (table: "document" | "ingest_job", id: string) =>
  (
    await pg.query<{ config: unknown }>(
      `SELECT config FROM ${table} WHERE id = $1`,
      [id],
    )
  ).rows[0]?.config;
const body = (
  metadata: MetadataPatch,
  documentIds = ["doc"],
  jobIds: string[] = [],
): Body => ({
  namespaceId: "ns1",
  tenantId: null,
  documentIds,
  jobIds,
  metadata,
});

describe("metadata update worker", () => {
  it("merges a document patch while preserving parser configuration and unrelated metadata", async () => {
    await job({ metadata: { department: "support" } });
    await document("doc", {
      chunkSize: 1500,
      mode: "accurate",
      metadata: { category: "guide" },
    });
    const worker = await loadWorker();

    expect(
      await worker.run(body({ department: "engineering", reviewed: true })),
    ).toEqual({
      updatedDocuments: 1,
      updatedJobs: 0,
      skippedDocuments: 0,
      skippedJobs: 0,
    });
    expect(await configFor("document", "doc")).toEqual({
      chunkSize: 1500,
      mode: "accurate",
      metadata: {
        category: "guide",
        department: "engineering",
        reviewed: true,
      },
    });
    expect(await configFor("ingest_job", "job")).toEqual({
      metadata: { department: "support" },
    });
    expect(mocks.updateVectorMetadata).toHaveBeenCalledExactlyOnceWith(
      "doc",
      { department: "engineering", reviewed: true },
      undefined,
    );
  });

  it("propagates job defaults while preserving document overrides in vectors and saved exports", async () => {
    await job({
      chunkSize: 2048,
      metadata: { department: "support", category: "guide" },
    });
    await document("inherited");
    await document("override", {
      mode: "fast",
      metadata: { department: "finance" },
    });
    mocks.getChunks.mockResolvedValue({
      total_chunks: 1,
      total_characters: 9,
      metadata: {
        page_url: "https://example.com/guide",
        department: "support",
      },
      chunks: [
        {
          id: "chunk1",
          text: "Some text",
          metadata: { sequence_number: 0, department: "support" },
        },
      ],
    });
    const worker = await loadWorker();

    expect(
      await worker.run(
        body(
          { department: "engineering", reviewed: true },
          ["inherited", "override"],
          ["job"],
        ),
      ),
    ).toEqual({
      updatedDocuments: 2,
      updatedJobs: 1,
      skippedDocuments: 0,
      skippedJobs: 0,
    });
    expect(await configFor("ingest_job", "job")).toEqual({
      chunkSize: 2048,
      metadata: {
        category: "guide",
        department: "engineering",
        reviewed: true,
      },
    });
    expect(await configFor("document", "inherited")).toBeNull();
    expect(await configFor("document", "override")).toEqual({
      mode: "fast",
      metadata: { department: "finance" },
    });
    expect(mocks.updateVectorMetadata.mock.calls).toEqual([
      ["inherited", { department: "engineering", reviewed: true }, ["chunk1"]],
      ["override", { department: "finance", reviewed: true }, ["chunk1"]],
    ]);
    const exports = mocks.upload.mock.calls.map((call) => [
      call[0] as string,
      JSON.parse(call[1] as string) as unknown,
    ]);
    expect(exports).toEqual([
      [
        "namespaces/ns1/documents/inherited/chunks.json",
        {
          total_chunks: 1,
          total_characters: 9,
          metadata: {
            page_url: "https://example.com/guide",
            department: "engineering",
            reviewed: true,
          },
          chunks: [
            {
              id: "chunk1",
              text: "Some text",
              metadata: {
                sequence_number: 0,
                department: "engineering",
                reviewed: true,
              },
            },
          ],
        },
      ],
      [
        "namespaces/ns1/documents/override/chunks.json",
        {
          total_chunks: 1,
          total_characters: 9,
          metadata: {
            page_url: "https://example.com/guide",
            department: "finance",
            reviewed: true,
          },
          chunks: [
            {
              id: "chunk1",
              text: "Some text",
              metadata: {
                sequence_number: 0,
                department: "finance",
                reviewed: true,
              },
            },
          ],
        },
      ],
    ]);
  });

  it("keeps document config uncommitted when a vector write fails and safely retries", async () => {
    await job();
    await document("doc", { metadata: { reviewed: false } });
    const worker = await loadWorker();
    mocks.updateVectorMetadata.mockRejectedValueOnce(
      new Error("Provider unavailable"),
    );

    await expect(worker.run(body({ reviewed: true }))).rejects.toThrow(
      "Provider unavailable",
    );
    expect(await configFor("document", "doc")).toEqual({
      metadata: { reviewed: false },
    });
    expect(mocks.upload).not.toHaveBeenCalled();

    await worker.run(body({ reviewed: true }));
    expect(await configFor("document", "doc")).toEqual({
      metadata: { reviewed: true },
    });
    expect(mocks.updateVectorMetadata).toHaveBeenCalledTimes(2);
  });

  it.each(["document", "ingest_job"] as const)(
    "blocks external writes if %s becomes active before execution",
    async (table) => {
      await job();
      await document();
      const worker = await loadWorker();
      await pg.exec(`UPDATE ${table} SET status = 'PROCESSING'`);

      await expect(worker.run(body({ reviewed: true }))).rejects.toThrow(
        "Metadata cannot be updated while ingestion is active",
      );
      expect(mocks.updateVectorMetadata).not.toHaveBeenCalled();
      expect(mocks.upload).not.toHaveBeenCalled();
      expect(await configFor("document", "doc")).toBeNull();
    },
  );

  it("skips disappeared documents and records outside the snapshot tenant scope", async () => {
    await job(null, "tenant1");
    await document("tenant_doc", null, "tenant1");
    const worker = await loadWorker();

    expect(
      await worker.run(body({ reviewed: true }, ["deleted", "tenant_doc"])),
    ).toEqual({
      updatedDocuments: 0,
      updatedJobs: 0,
      skippedDocuments: 2,
      skippedJobs: 0,
    });
    expect(await configFor("document", "tenant_doc")).toBeNull();
    expect(mocks.updateVectorMetadata).not.toHaveBeenCalled();
  });

  it("loads an eu patch by opaque request id before updating stored metadata", async () => {
    await job();
    await document();
    const worker = await loadWorker("eu");
    mocks.getStoredPatch.mockResolvedValue({ reviewed: true });

    await worker.run({
      namespaceId: "ns1",
      tenantId: null,
      documentIds: ["doc"],
      jobIds: [],
      metadataRequestId: "e67c1117-bde9-401c-b5b3-9c4caf801ee7",
    });
    expect(await configFor("document", "doc")).toEqual({
      metadata: { reviewed: true },
    });
    expect(mocks.getStoredPatch).toHaveBeenCalledExactlyOnceWith(
      "e67c1117-bde9-401c-b5b3-9c4caf801ee7",
    );
  });
});
