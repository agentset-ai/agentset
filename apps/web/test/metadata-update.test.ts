import type { z } from "zod/v4";
import { updateMetadataSchema } from "@/schemas/api/metadata";
import {
  getMetadataUpdateStatus,
  queueMetadataUpdate,
} from "@/services/metadata/update";
import { PGlite } from "@electric-sql/pglite";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { metadataUpdateRequestSchema } from "@agentset/jobs";
import { metadataFilterToSql, Prisma } from "@agentset/db";
import { metadataFilterSchema } from "@agentset/validation";

const state = vi.hoisted(() => ({
  query: vi.fn(),
  documents: vi.fn(),
  trigger:
    vi.fn<
      (
        payload: z.infer<typeof metadataUpdateRequestSchema>,
      ) => Promise<{ id: string }>
    >(),
  retrieve: vi.fn(),
}));

vi.mock("@agentset/db/client", () => ({
  db: { $queryRaw: state.query, document: { findMany: state.documents } },
}));
vi.mock("@agentset/jobs", async () => {
  const { z } = await import("zod/v4");
  return {
    UPDATE_METADATA_JOB_ID: "update-metadata",
    triggerUpdateMetadata: state.trigger,
    retrieveMetadataUpdate: state.retrieve,
    updateMetadataBodySchema: z.object({
      namespaceId: z.string(),
      tenantId: z.string().nullable(),
    }),
  };
});

const pg = new PGlite();
const args = { namespaceId: "ns1", target: "documents" as const };

beforeAll(async () => {
  await pg.exec(`
    CREATE TABLE ingest_job (
      id text PRIMARY KEY, "namespaceId" text, "tenantId" text,
      status text, config jsonb
    );
    CREATE TABLE document (
      id text PRIMARY KEY, "namespaceId" text, "tenantId" text,
      "ingestJobId" text, status text, config jsonb
    );
  `);
});

afterAll(async () => {
  await pg.close();
});

beforeEach(async () => {
  vi.clearAllMocks();
  await pg.exec("TRUNCATE document, ingest_job");
  state.query.mockImplementation(
    async (sql: Prisma.Sql) => (await pg.query(sql.text, sql.values)).rows,
  );
  state.trigger.mockResolvedValue({ id: "run_1" });
  state.documents.mockResolvedValue([]);
});

const job = async (
  id: string,
  metadata: object,
  namespaceId = "ns1",
  tenantId: string | null = null,
  status = "COMPLETED",
) => {
  await pg.query("INSERT INTO ingest_job VALUES ($1,$2,$3,$4,$5)", [
    id,
    namespaceId,
    tenantId,
    status,
    JSON.stringify({ metadata }),
  ]);
};
const document = async (
  id: string,
  ingestJobId: string,
  metadata: object | null = null,
  namespaceId = "ns1",
  tenantId: string | null = null,
  status = "COMPLETED",
) => {
  await pg.query("INSERT INTO document VALUES ($1,$2,$3,$4,$5,$6)", [
    id,
    namespaceId,
    tenantId,
    ingestJobId,
    status,
    metadata === null ? null : JSON.stringify({ metadata }),
  ]);
};

describe("metadata update selection", () => {
  it("matches inherited defaults and document overrides within exactly one tenant and namespace", async () => {
    await job("base", { department: "engineering" });
    await document("inherited", "base");
    await document("override", "base", { department: "finance" });
    await job("tenant", { department: "engineering" }, "ns1", "tenant1");
    await document("tenant_doc", "tenant", null, "ns1", "tenant1");
    await job("other", { department: "engineering" }, "ns2");
    await document("other_doc", "other", null, "ns2");

    expect(
      await queueMetadataUpdate({
        ...args,
        data: updateMetadataSchema.parse({
          filter: { department: "engineering" },
          metadata: { reviewed: true },
        }),
      }),
    ).toEqual({ runId: "run_1", matchedDocuments: 1, matchedJobs: 0 });
    expect(state.trigger.mock.calls[0]?.[0].documentIds).toEqual(["inherited"]);
    await queueMetadataUpdate({
      ...args,
      tenantId: "tenant1",
      data: updateMetadataSchema.parse({
        filter: {},
        metadata: { reviewed: true },
      }),
    });
    expect(state.trigger.mock.calls[1]?.[0].documentIds).toEqual([
      "tenant_doc",
    ]);
  });

  it("returns no match without creating a run", async () => {
    expect(
      await queueMetadataUpdate({
        ...args,
        data: updateMetadataSchema.parse({
          filter: { category: "absent" },
          metadata: { reviewed: true },
        }),
      }),
    ).toEqual({ runId: null, matchedDocuments: 0, matchedJobs: 0 });
    expect(state.trigger).not.toHaveBeenCalled();
  });

  it.each(["document", "parent job"])(
    "rejects a matching active %s before enqueueing",
    async (active) => {
      await job(
        "job",
        { team: "engineering" },
        "ns1",
        null,
        active === "parent job" ? "PROCESSING" : "COMPLETED",
      );
      await document(
        "doc",
        "job",
        null,
        "ns1",
        null,
        active === "document" ? "QUEUED" : "COMPLETED",
      );
      await expect(
        queueMetadataUpdate({
          ...args,
          data: updateMetadataSchema.parse({
            filter: { team: "engineering" },
            metadata: { reviewed: true },
          }),
        }),
      ).rejects.toMatchObject({ code: "conflict" });
      expect(state.trigger).not.toHaveBeenCalled();
    },
  );

  it("matches jobs by their own metadata in the requested tenant", async () => {
    await job("match", { category: "guide" }, "ns1", "t1");
    await job("wrong_tenant", { category: "guide" }, "ns1", "t2");
    await job("wrong_namespace", { category: "guide" }, "ns2", "t1");
    await job("wrong_metadata", { category: "report" }, "ns1", "t1");
    await queueMetadataUpdate({
      ...args,
      target: "ingest-jobs",
      tenantId: "t1",
      data: updateMetadataSchema.parse({
        filter: { category: "guide" },
        metadata: { reviewed: true },
      }),
    });
    expect(state.trigger.mock.calls[0]?.[0].jobIds).toEqual(["match"]);
  });

  it("rejects an oversized selection without silently truncating updates", async () => {
    await job("job", {});
    await pg.exec(
      `INSERT INTO document SELECT 'doc' || n, 'ns1', NULL, 'job', 'COMPLETED', NULL FROM generate_series(1,1001) n`,
    );
    await expect(
      queueMetadataUpdate({
        ...args,
        data: updateMetadataSchema.parse({
          filter: {},
          metadata: { reviewed: true },
        }),
      }),
    ).rejects.toMatchObject({ code: "bad_request" });
    expect(state.trigger).not.toHaveBeenCalled();
  });
});

describe("metadata predicates executed by PostgreSQL", () => {
  it.each([
    [{ count: { $gte: 2, $lt: 5 } }, ["number"]],
    [{ count: { $ne: 3 } }, ["missing", "string"]],
    [{ count: { $exists: false } }, ["missing"]],
    [{ tags: { $in: ["blue"] } }, ["number"]],
    [{ tags: { $nin: ["blue"] } }, ["missing", "string"]],
    [{ tags: { $all: ["red", "blue"] } }, ["number"]],
    [{ tags: ["red", "blue"] }, ["number"]],
    [
      {
        $or: [{ count: 3 }, { count: "3" }],
        $not: { tags: { $exists: true } },
      },
      ["string"],
    ],
    [{ $nor: [{ count: 3 }, { count: "3" }] }, ["missing"]],
  ])(
    "evaluates %j with typed values, arrays, and missing fields",
    async (filter, ids) => {
      await job("number", { count: 3, tags: ["red", "blue"] });
      await job("string", { count: "3" });
      await job("missing", {});
      const predicate = metadataFilterToSql(
        metadataFilterSchema.parse(filter),
        Prisma.sql`config->'metadata'`,
      );
      const sql = Prisma.sql`SELECT id FROM ingest_job WHERE ${predicate} ORDER BY id`;
      const { rows } = await pg.query<{ id: string }>(sql.text, sql.values);
      expect(rows.map((row) => row.id)).toEqual(ids);
    },
  );

  it("treats SQL-looking keys and values as literal metadata", async () => {
    const key = "x') OR TRUE --";
    const value = "'; DROP TABLE document; --";
    await job("literal", { [key]: value });
    await job("other", {});
    const predicate = metadataFilterToSql(
      metadataFilterSchema.parse({ [key]: value }),
      Prisma.sql`config->'metadata'`,
    );
    const sql = Prisma.sql`SELECT id FROM ingest_job WHERE ${predicate}`;
    expect((await pg.query<{ id: string }>(sql.text, sql.values)).rows).toEqual(
      [{ id: "literal" }],
    );
  });
});

describe("metadata API validation and run access", () => {
  it.each([
    { metadata: {} },
    { metadata: { documentId: "different" } },
    { metadata: { _node_content: "different" } },
    { metadata: { team: { nested: true } } },
    { filter: { team: { $regex: ".*" } } },
    { filter: { $or: [{}] } },
    { filter: { count: { $gte: "3" } } },
  ])("rejects invalid or reserved mutations: %j", (invalid) => {
    expect(
      updateMetadataSchema.safeParse({
        filter: {},
        metadata: { reviewed: true },
        ...invalid,
      }).success,
    ).toBe(false);
  });

  it.each([
    { namespaceId: "other", tenantId: null },
    { namespaceId: "ns1", tenantId: "other" },
  ])("does not reveal a run from another scope: %j", async (payload) => {
    state.retrieve.mockResolvedValue({
      id: "run_1",
      taskIdentifier: "update-metadata",
      payload,
      status: "COMPLETED",
      output: {},
    });
    await expect(
      getMetadataUpdateStatus({ namespaceId: "ns1", runId: "run_1" }),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});
