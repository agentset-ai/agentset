import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { VectorStore } from "../src/vector-store/common/vector-store";
import { importForRegion } from "./helpers/region";

const mocks = vi.hoisted(() => ({
  env: {
    DEFAULT_COHERE_API_KEY: "cohere-key",
    DEFAULT_COHERE_BASE_URL: undefined as string | undefined,
    DEFAULT_ZEROENTROPY_API_KEY: "zeroentropy-key" as string | undefined,
  },
  cohereOptions: [] as unknown[],
  cohereRerank: vi.fn(),
}));

vi.mock("../src/env", () => ({ env: mocks.env }));

vi.mock("cohere-ai", () => ({
  CohereClientV2: class {
    rerank = mocks.cohereRerank;

    constructor(options: unknown) {
      mocks.cohereOptions.push(options);
    }
  },
}));

vi.mock("zeroentropy", () => ({
  ZeroEntropy: class {},
}));

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  embed: vi.fn(() => Promise.resolve({ embedding: [0.1, 0.2] })),
}));

const importRerank = (region: "us" | "eu") =>
  importForRegion(region, async () => ({
    ...(await import("../src/rerank")),
    ...(await import("../src/rerank/cohere")),
    ...(await import("../src/rerank/zeroentropy")),
    ...(await import("../src/vector-store/query")),
    ...(await import("../src/errors")),
  }));

const results = [
  { id: "a", text: "first chunk" },
  { id: "b", text: "second chunk" },
];

beforeEach(() => {
  mocks.env.DEFAULT_COHERE_BASE_URL = undefined;
  mocks.env.DEFAULT_ZEROENTROPY_API_KEY = "zeroentropy-key";
  mocks.cohereOptions.length = 0;
  mocks.cohereRerank.mockReset();
  mocks.cohereRerank.mockResolvedValue({
    results: [{ index: 1, relevanceScore: 0.9 }],
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("CohereReranker", () => {
  it("uses the Cohere API when no base URL is set", async () => {
    const { CohereReranker } = await importRerank("us");

    await new CohereReranker("rerank-v4.0-pro", {
      apiKey: "key",
    }).doRerank(results, { query: "q", limit: 1 });

    expect(mocks.cohereOptions).toStrictEqual([{ token: "key" }]);
    expect(mocks.cohereRerank).toHaveBeenCalledWith({
      documents: ["first chunk", "second chunk"],
      query: "q",
      topN: 1,
      model: "rerank-v4.0-pro",
    });
  });

  it("uses the Foundry deployment name with a base URL", async () => {
    const { CohereReranker } = await importRerank("eu");
    const baseUrl = "https://example.services.ai.azure.com/providers/cohere";

    await new CohereReranker("rerank-v4.0-fast", {
      apiKey: "key",
      baseUrl,
    }).doRerank(results, { query: "q", limit: 1 });

    expect(mocks.cohereOptions).toStrictEqual([{ token: "key", baseUrl }]);
    expect(mocks.cohereRerank).toHaveBeenCalledWith(
      expect.objectContaining({ model: "Cohere-rerank-v4.0-fast" }),
    );
  });
});

describe("getRerankingModel (us)", () => {
  it("creates a Cohere reranker with the API key only", async () => {
    const { getRerankingModel, CohereReranker } = await importRerank("us");

    await expect(
      getRerankingModel("cohere:rerank-v3.5"),
    ).resolves.toBeInstanceOf(CohereReranker);
    expect(mocks.cohereOptions).toStrictEqual([{ token: "cohere-key" }]);
  });

  it("creates a ZeroEntropy reranker", async () => {
    const { getRerankingModel, ZeroentropyReranker } = await importRerank("us");

    await expect(
      getRerankingModel("zeroentropy:zerank-2"),
    ).resolves.toBeInstanceOf(ZeroentropyReranker);
  });

  it("rejects ZeroEntropy without an API key", async () => {
    mocks.env.DEFAULT_ZEROENTROPY_API_KEY = undefined;
    const { getRerankingModel, ProviderUnavailableError } =
      await importRerank("us");

    await expect(getRerankingModel("zeroentropy:zerank-2")).rejects.toThrow(
      ProviderUnavailableError,
    );
  });
});

describe("getRerankingModel (eu)", () => {
  it.each(["cohere:rerank-v4.0-pro", "cohere:rerank-v4.0-fast"] as const)(
    "allows %s through the Foundry endpoint",
    async (model) => {
      mocks.env.DEFAULT_COHERE_BASE_URL =
        "https://example.services.ai.azure.com/providers/cohere";
      const { getRerankingModel } = await importRerank("eu");

      const reranker = await getRerankingModel(model);
      await reranker.doRerank(results, { query: "q", limit: 1 });

      expect(mocks.cohereOptions).toStrictEqual([
        { token: "cohere-key", baseUrl: mocks.env.DEFAULT_COHERE_BASE_URL },
      ]);
      expect(mocks.cohereRerank).toHaveBeenCalledWith(
        expect.objectContaining({
          model: `Cohere-${model.replace("cohere:", "")}`,
        }),
      );
    },
  );

  it.each([
    "cohere:rerank-v3.5",
    "cohere:rerank-english-v3.0",
    "cohere:rerank-multilingual-v3.0",
    "zeroentropy:zerank-2",
    "zeroentropy:zerank-1",
    "zeroentropy:zerank-1-small",
  ] as const)("rejects %s", async (model) => {
    const { getRerankingModel, ProviderUnavailableError } =
      await importRerank("eu");

    await expect(getRerankingModel(model)).rejects.toThrow(
      ProviderUnavailableError,
    );
    expect(mocks.cohereOptions).toHaveLength(0);
  });

  it.each([
    undefined,
    "https://api.cohere.com",
    "http://example.services.ai.azure.com/providers/cohere",
    "not a url",
  ])("rejects Cohere with the base URL %s", async (baseUrl) => {
    mocks.env.DEFAULT_COHERE_BASE_URL = baseUrl;
    const { getRerankingModel, ProviderUnavailableError } =
      await importRerank("eu");

    await expect(getRerankingModel("cohere:rerank-v4.0-pro")).rejects.toThrow(
      ProviderUnavailableError,
    );
    expect(mocks.cohereOptions).toHaveLength(0);
  });
});

describe("rerank", () => {
  const failingReranker = {
    doRerank: () =>
      Promise.reject(new Error("upstream rejected: first chunk text")),
  };

  it("returns the original results silently on us", async () => {
    const { rerank } = await importRerank("us");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await expect(
      rerank(results, {
        model: failingReranker,
        query: "q",
        limit: 1,
        logContext: { namespaceId: "ns_1" },
      }),
    ).resolves.toBe(results);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("returns the original results and logs only the error summary on eu", async () => {
    const { rerank } = await importRerank("eu");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await expect(
      rerank(results, {
        model: failingReranker,
        query: "q",
        limit: 1,
        logContext: { namespaceId: "ns_1" },
      }),
    ).resolves.toBe(results);
    expect(consoleError).toHaveBeenCalledWith("Failed to rerank results", {
      error: { name: "Error" },
      context: { namespaceId: "ns_1" },
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("chunk");
  });

  it("logs the namespace id when a query's rerank fails on eu", async () => {
    mocks.env.DEFAULT_COHERE_BASE_URL =
      "https://example.services.ai.azure.com/providers/cohere";
    mocks.cohereRerank.mockRejectedValue(new Error("first chunk text"));
    const { queryVectorStore } = await importRerank("eu");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const vectorStore = {
      namespaceId: "ns_1",
      query: () => Promise.resolve(results),
    } as unknown as VectorStore;

    const result = await queryVectorStore({
      query: "q",
      topK: 2,
      embeddingModel: {} as never,
      vectorStore,
      rerank: { model: "cohere:rerank-v4.0-pro", limit: 1 },
    });

    expect(result.results).toBe(results);
    expect(consoleError).toHaveBeenCalledWith("Failed to rerank results", {
      error: { name: "Error" },
      context: { namespaceId: "ns_1" },
    });
  });
});
