import type { APIPromise } from "@turbopuffer/turbopuffer";
import { TextNode } from "@llamaindex/core/schema";
import { nodeToMetadata } from "@llamaindex/core/vector-store";
import { Index, Errors as PineconeErrors } from "@pinecone-database/pinecone";
import { Turbopuffer as TurbopufferClient } from "@turbopuffer/turbopuffer";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { Pinecone } from "../../src/vector-store/pinecone";
import { Turbopuffer } from "../../src/vector-store/turbopuffer";

const pineconeList = vi.spyOn(Index.prototype, "listPaginated");
const pineconeUpdate = vi.spyOn(Index.prototype, "update");
const pineconeQuery = vi.spyOn(Index.prototype, "query");
const turbopufferWrite = vi.spyOn(
  TurbopufferClient.Namespace.prototype,
  "write",
);
const turbopufferQuery = vi.spyOn(
  TurbopufferClient.Namespace.prototype,
  "query",
);

const resolveTurbopuffer = <T>(response: T) =>
  Promise.resolve(response) as APIPromise<T>;

const turbopufferWriteResponse: TurbopufferClient.NamespaceWriteResponse = {
  status: "OK",
  message: "Success",
  rows_affected: 0,
  billing: { billable_logical_bytes_written: 0 },
};

const makeTurbopufferPage = (
  ids: string[],
): TurbopufferClient.NamespaceQueryResponse => ({
  rows: ids.map((id) => ({ id })),
  billing: {
    billable_logical_bytes_queried: 0,
    billable_logical_bytes_returned: 0,
  },
  performance: {
    approx_namespace_size: 0,
    cache_hit_ratio: 0,
    cache_temperature: "cold",
    exhaustive_search_count: 0,
    query_execution_ms: 0,
    server_total_ms: 0,
    client_total_ms: 0,
  },
});

const makePinecone = () =>
  new Pinecone({
    apiKey: "test-api-key",
    indexHost: "https://metadata.svc.pinecone.io",
    namespaceId: "ns_1",
  });

const makeTurbopuffer = () =>
  new Turbopuffer({
    apiKey: "test-api-key",
    region: "aws-us-east-1",
    namespaceId: "ns_1",
  });

const makeBatchGuard = () => {
  let insideBatch = false;
  return {
    isActive: () => insideBatch,
    runBatch: vi.fn(async (write: () => Promise<void>) => {
      expect(insideBatch).toBe(false);
      insideBatch = true;
      try {
        await write();
      } finally {
        insideBatch = false;
      }
    }),
  };
};

beforeEach(() => {
  vi.resetAllMocks();
  pineconeList.mockResolvedValue({ vectors: [] });
  pineconeUpdate.mockResolvedValue();
  turbopufferQuery.mockResolvedValue(makeTurbopufferPage([]));
  turbopufferWrite.mockResolvedValue(turbopufferWriteResponse);
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe("Pinecone document metadata updates", () => {
  it("updates every page of document chunks with metadata-only SDK requests", async () => {
    const guard = makeBatchGuard();
    pineconeList
      .mockImplementationOnce(() => {
        expect(guard.isActive()).toBe(false);
        return Promise.resolve({
          vectors: [{ id: "doc_1#chunk-a" }],
          pagination: { next: "next-page" },
        });
      })
      .mockImplementationOnce(() => {
        expect(guard.isActive()).toBe(false);
        return Promise.resolve({
          vectors: [{ id: "doc_1#chunk-b" }, { id: "doc_1#chunk-c" }],
        });
      });
    pineconeUpdate.mockImplementation(() => {
      expect(guard.isActive()).toBe(true);
      return Promise.resolve();
    });

    await makePinecone().updateDocumentMetadata(
      "doc_1",
      { category: "guide" },
      undefined,
      { runBatch: guard.runBatch },
    );

    expect(guard.runBatch).toHaveBeenCalledTimes(2);
    expect(pineconeList.mock.calls).toEqual([
      [{ prefix: "doc_1#", paginationToken: undefined }],
      [{ prefix: "doc_1#", paginationToken: "next-page" }],
    ]);
    expect(pineconeUpdate.mock.calls).toEqual([
      [{ id: "doc_1#chunk-a", metadata: { category: "guide" } }],
      [{ id: "doc_1#chunk-b", metadata: { category: "guide" } }],
      [{ id: "doc_1#chunk-c", metadata: { category: "guide" } }],
    ]);
  });

  it("uses known partition chunk IDs without the serverless-only list API", async () => {
    const chunkIds = Array.from({ length: 25 }, (_, index) => `chunk-${index}`);
    const guard = makeBatchGuard();
    pineconeUpdate.mockImplementation(() => {
      expect(guard.isActive()).toBe(true);
      return Promise.resolve();
    });

    await makePinecone().updateDocumentMetadata(
      "doc_1",
      { published: true },
      chunkIds,
      { runBatch: guard.runBatch },
    );

    expect(guard.runBatch).toHaveBeenCalledTimes(3);
    expect(pineconeList).not.toHaveBeenCalled();
    expect(pineconeUpdate.mock.calls).toEqual(
      chunkIds.map((id) => [
        { id: `doc_1#${id}`, metadata: { published: true } },
      ]),
    );
  });

  it("keeps the batch guard active until all in-flight updates settle after a failure", async () => {
    const guard = makeBatchGuard();
    const updateError = new Error("Pinecone update failed");
    let finishPending!: () => void;
    const pending = new Promise<void>((resolve) => {
      finishPending = resolve;
    });
    pineconeUpdate
      .mockRejectedValueOnce(updateError)
      .mockImplementationOnce(() => pending);
    let updateFinished = false;
    const update = makePinecone()
      .updateDocumentMetadata(
        "doc_1",
        { published: true },
        ["failed-chunk", "pending-chunk"],
        { runBatch: guard.runBatch },
      )
      .finally(() => {
        updateFinished = true;
      });
    const failure = expect(update).rejects.toBe(updateError);

    try {
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(guard.isActive()).toBe(true);
      expect(updateFinished).toBe(false);
    } finally {
      finishPending();
    }

    await failure;
    expect(guard.isActive()).toBe(false);
  });

  it("propagates a provider failure when another chunk in the batch returns 404", async () => {
    const providerError = new PineconeErrors.PineconeInternalServerError({
      status: 500,
    });
    pineconeUpdate
      .mockRejectedValueOnce(
        new PineconeErrors.PineconeNotFoundError({ status: 404 }),
      )
      .mockRejectedValueOnce(providerError);

    await expect(
      makePinecone().updateDocumentMetadata("doc_1", { published: true }, [
        "missing-chunk",
        "failed-chunk",
      ]),
    ).rejects.toBe(providerError);
  });

  it("returns the current flat metadata for legacy serialized chunks", async () => {
    const legacyNode = new TextNode({
      id_: "legacy-chunk",
      text: "Original document text",
      metadata: { category: "old", owner: "Alice", documentId: "doc_1" },
    });
    pineconeQuery.mockResolvedValue({
      namespace: "agentset:ns_1",
      matches: [
        {
          id: "doc_1#legacy-chunk",
          values: [],
          metadata: {
            ...nodeToMetadata(legacyNode),
            category: "updated",
            published: true,
          },
        },
      ],
    });

    const results = await makePinecone().query({
      mode: { type: "semantic", vector: [0.1, 0.2] },
      topK: 1,
      includeMetadata: true,
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.text).toBe("Original document text");
    expect(results[0]?.metadata).toMatchObject({
      category: "updated",
      published: true,
      owner: "Alice",
      documentId: "doc_1",
    });
  });

  it("ignores a document in a missing namespace", async () => {
    pineconeList.mockRejectedValue(
      new PineconeErrors.PineconeNotFoundError({ status: 404 }),
    );

    await expect(
      makePinecone().updateDocumentMetadata("doc_1", { category: "guide" }),
    ).resolves.toBeUndefined();
    expect(pineconeUpdate).not.toHaveBeenCalled();
  });
});

describe("Turbopuffer document metadata updates", () => {
  it("traverses all document IDs and patches rows without the filter-write limit", async () => {
    const guard = makeBatchGuard();
    const firstPage = Array.from(
      { length: 1000 },
      (_, index) => `doc_1#chunk-${index.toString().padStart(4, "0")}`,
    );
    turbopufferQuery
      .mockImplementationOnce(() => {
        expect(guard.isActive()).toBe(false);
        return resolveTurbopuffer(makeTurbopufferPage(firstPage));
      })
      .mockImplementationOnce(() => {
        expect(guard.isActive()).toBe(false);
        return resolveTurbopuffer(makeTurbopufferPage(["doc_1#chunk-1000"]));
      });
    turbopufferWrite.mockImplementation(() => {
      expect(guard.isActive()).toBe(true);
      return resolveTurbopuffer(turbopufferWriteResponse);
    });

    await makeTurbopuffer().updateDocumentMetadata(
      "doc_1",
      { category: "guide", tags: ["public"] },
      undefined,
      { runBatch: guard.runBatch },
    );

    expect(guard.runBatch).toHaveBeenCalledTimes(2);
    expect(turbopufferQuery.mock.calls).toEqual([
      [
        {
          rank_by: ["id", "asc"],
          filters: ["And", [["documentId", "Eq", "doc_1"]]],
          top_k: 1000,
          include_attributes: false,
          consistency: { level: "strong" },
        },
      ],
      [
        {
          rank_by: ["id", "asc"],
          filters: [
            "And",
            [
              ["documentId", "Eq", "doc_1"],
              ["id", "Gt", "doc_1#chunk-0999"],
            ],
          ],
          top_k: 1000,
          include_attributes: false,
          consistency: { level: "strong" },
        },
      ],
    ]);

    const requests = turbopufferWrite.mock.calls.map(([request]) => request);
    for (const request of requests) {
      expect(request).toEqual({ patch_rows: expect.any(Array) });
    }
    expect(requests.flatMap((request) => request?.patch_rows ?? [])).toEqual(
      [...firstPage, "doc_1#chunk-1000"].map((id) => ({
        id,
        category: "guide",
        tags: ["public"],
      })),
    );
  });

  it("patches every known chunk without replacing its text or vector", async () => {
    const guard = makeBatchGuard();
    const chunkIds = Array.from(
      { length: 1001 },
      (_, index) => `chunk-${index}`,
    );
    turbopufferWrite.mockImplementation(() => {
      expect(guard.isActive()).toBe(true);
      return resolveTurbopuffer(turbopufferWriteResponse);
    });

    await makeTurbopuffer().updateDocumentMetadata(
      "doc_1",
      { published: true },
      chunkIds,
      { runBatch: guard.runBatch },
    );

    expect(guard.runBatch).toHaveBeenCalledTimes(2);
    expect(turbopufferQuery).not.toHaveBeenCalled();
    const requests = turbopufferWrite.mock.calls.map(([request]) => request);
    for (const request of requests) {
      expect(request).toEqual({ patch_rows: expect.any(Array) });
    }
    expect(requests.flatMap((request) => request?.patch_rows ?? [])).toEqual(
      chunkIds.map((id) => ({ id: `doc_1#${id}`, published: true })),
    );
  });

  it("ignores a document in a missing namespace", async () => {
    turbopufferQuery.mockRejectedValue(
      new TurbopufferClient.NotFoundError(
        404,
        undefined,
        "Namespace not found",
        new Headers(),
      ),
    );

    await expect(
      makeTurbopuffer().updateDocumentMetadata("doc_1", { category: "guide" }),
    ).resolves.toBeUndefined();
    expect(turbopufferWrite).not.toHaveBeenCalled();
  });
});

it.each([
  {
    provider: "Pinecone",
    makeStore: makePinecone,
    chunkCount: 25,
    getWriteCount: () => pineconeUpdate.mock.calls.length,
    firstBatchWriteCount: 10,
  },
  {
    provider: "Turbopuffer",
    makeStore: makeTurbopuffer,
    chunkCount: 2501,
    getWriteCount: () => turbopufferWrite.mock.calls.length,
    firstBatchWriteCount: 1,
  },
])(
  "stops remaining $provider writes when a batch guard fails",
  async ({ makeStore, chunkCount, getWriteCount, firstBatchWriteCount }) => {
    const guardError = new Error("Document changed during metadata update");
    const runBatch = vi
      .fn<(write: () => Promise<void>) => Promise<void>>()
      .mockImplementationOnce((write) => write())
      .mockRejectedValue(guardError);
    const chunkIds = Array.from(
      { length: chunkCount },
      (_, index) => `chunk-${index}`,
    );

    await expect(
      makeStore().updateDocumentMetadata(
        "doc_1",
        { published: true },
        chunkIds,
        { runBatch },
      ),
    ).rejects.toBe(guardError);

    expect(runBatch).toHaveBeenCalledTimes(2);
    expect(getWriteCount()).toBe(firstBatchWriteCount);
  },
);
