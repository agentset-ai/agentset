import { afterEach, describe, expect, it, vi } from "vitest";

import { importForRegion } from "./helpers/region";

vi.mock("../src/env", () => ({
  env: {
    DEFAULT_AZURE_API_KEY: "test-key",
    DEFAULT_AZURE_RESOURCE_NAME: "test-resource",
  },
}));

const importEmbedding = (region: "us" | "eu") =>
  importForRegion(region, async () => ({
    ...(await import("../src/embedding")),
    ...(await import("../src/embedding/wrap-model")),
    ...(await import("../src/errors")),
  }));

const US_HOSTED_CONFIGS = [
  { provider: "OPENAI", model: "text-embedding-3-small", apiKey: "key" },
  { provider: "VOYAGE", model: "voyage-3", apiKey: "key" },
  { provider: "GOOGLE", model: "text-embedding-004", apiKey: "key" },
] as const;

const MANAGED_CONFIG = {
  provider: "MANAGED_OPENAI",
  model: "text-embedding-3-large",
} as const;

const AZURE_CONFIG = {
  provider: "AZURE_OPENAI",
  model: "text-embedding-3-large",
  resourceName: "customer-resource",
  deployment: "embeddings",
  apiKey: "key",
} as const;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getNamespaceEmbeddingModel", () => {
  it.each([...US_HOSTED_CONFIGS, AZURE_CONFIG, MANAGED_CONFIG])(
    "creates a model for $provider on us",
    async (embeddingConfig) => {
      const { getNamespaceEmbeddingModel, WrapEmbeddingModel } =
        await importEmbedding("us");

      await expect(
        getNamespaceEmbeddingModel({ embeddingConfig }),
      ).resolves.toBeInstanceOf(WrapEmbeddingModel);
    },
  );

  it("creates the managed model on eu", async () => {
    const { getNamespaceEmbeddingModel, WrapEmbeddingModel } =
      await importEmbedding("eu");

    await expect(
      getNamespaceEmbeddingModel({ embeddingConfig: MANAGED_CONFIG }),
    ).resolves.toBeInstanceOf(WrapEmbeddingModel);
  });

  it("falls back to the managed model on eu", async () => {
    const { getNamespaceEmbeddingModel, WrapEmbeddingModel } =
      await importEmbedding("eu");

    await expect(
      getNamespaceEmbeddingModel({ embeddingConfig: null }),
    ).resolves.toBeInstanceOf(WrapEmbeddingModel);
  });

  it.each([...US_HOSTED_CONFIGS, AZURE_CONFIG])(
    "rejects $provider on eu",
    async (embeddingConfig) => {
      const { getNamespaceEmbeddingModel, ProviderUnavailableError } =
        await importEmbedding("eu");

      await expect(
        getNamespaceEmbeddingModel({ embeddingConfig }),
      ).rejects.toThrow(ProviderUnavailableError);
    },
  );

  it("names the managed model when rejecting Azure OpenAI on eu", async () => {
    const { getNamespaceEmbeddingModel } = await importEmbedding("eu");

    await expect(
      getNamespaceEmbeddingModel({ embeddingConfig: AZURE_CONFIG }),
    ).rejects.toThrow(
      "Customer Azure OpenAI embeddings aren't available in this region yet. Use the managed embedding model (MANAGED_OPENAI).",
    );
  });
});
