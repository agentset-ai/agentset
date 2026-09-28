import { afterEach, describe, expect, it, vi } from "vitest";

import { importForRegion } from "./helpers/region";

const mocks = vi.hoisted(() => ({
  queryVectorStore:
    vi.fn<(options: { rerank?: unknown }) => Promise<unknown>>(),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("@agentset/engine");
  vi.doUnmock("@/lib/agentic/utils");
  mocks.queryVectorStore.mockReset();
});

describe("legacy agentic search reranker", () => {
  const runSearch = async (region: "us" | "eu") => {
    const { agenticSearch } = await importForRegion(region, () => {
      vi.doMock("@agentset/engine", () => ({
        queryVectorStore: mocks.queryVectorStore,
      }));
      vi.doMock("@/lib/agentic/utils", () => ({
        generateQueries: () => Promise.resolve({ queries: [], totalTokens: 0 }),
        evaluateQueries: () =>
          Promise.resolve({ canAnswer: true, totalTokens: 0 }),
      }));
      return import("@/lib/agentic/search");
    });
    mocks.queryVectorStore.mockResolvedValue({ query: "q", results: [] });

    await agenticSearch({
      model: {} as never,
      messages: [{ role: "user", content: "q" }],
      queryOptions: {
        topK: 10,
        embeddingModel: {} as never,
        vectorStore: { supportsKeyword: () => true } as never,
      },
      maxEvals: 1,
    });

    return mocks.queryVectorStore.mock.calls[0]![0].rerank;
  };

  it("uses Cohere Rerank v3.5 on us", async () => {
    await expect(runSearch("us")).resolves.toEqual({
      model: "cohere:rerank-v3.5",
      limit: 15,
    });
  });

  it("uses Cohere Rerank v4.0 Fast on eu", async () => {
    await expect(runSearch("eu")).resolves.toEqual({
      model: "cohere:rerank-v4.0-fast",
      limit: 15,
    });
  });
});

describe("create namespace embedding providers", () => {
  it("lists every provider on us", async () => {
    const { embeddingModels } = await importForRegion(
      "us",
      () => import("@/components/create-namespace/models"),
    );

    expect(embeddingModels.map((m) => m.value)).toEqual([
      "AZURE_OPENAI",
      "OPENAI",
      "VOYAGE",
      "GOOGLE",
    ]);
  });

  it("lists no providers besides the managed model on eu", async () => {
    const { embeddingModels } = await importForRegion(
      "eu",
      () => import("@/components/create-namespace/models"),
    );

    expect(embeddingModels).toEqual([]);
  });
});
