import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { importForRegion } from "./helpers/region";

const mocks = vi.hoisted(() => ({
  createNamespace:
    vi.fn<(args: { data: Record<string, unknown> }) => Promise<unknown>>(),
  getNamespaceVectorStore: vi.fn(),
  getNamespaceEmbeddingModel: vi.fn(),
}));

const load = (region: "us" | "eu") =>
  importForRegion(region, async () => {
    vi.doMock("@agentset/db/client", () => ({
      db: { namespace: { create: mocks.createNamespace } },
    }));
    vi.doMock("@agentset/engine", () => ({
      getNamespaceVectorStore: mocks.getNamespaceVectorStore,
      getNamespaceEmbeddingModel: mocks.getNamespaceEmbeddingModel,
    }));

    return {
      schemas: await import("@/schemas/api/namespace"),
      create: await import("@/services/namespaces/create"),
      validate: await import("@/services/namespaces/validate"),
      errors: await import("@/lib/api/errors"),
    };
  });

const BYO_MESSAGE =
  "EU namespaces need your own Turbopuffer or Pinecone credentials";

const TURBOPUFFER_EU = {
  provider: "TURBOPUFFER",
  apiKey: "key",
  region: "aws-eu-central-1",
} as const;

const MANAGED_EMBEDDING = {
  provider: "MANAGED_OPENAI",
  model: "text-embedding-3-large",
} as const;

const OPENAI_EMBEDDING = {
  provider: "OPENAI",
  model: "text-embedding-3-large",
  apiKey: "key",
} as const;

const AZURE_EMBEDDING = {
  provider: "AZURE_OPENAI",
  model: "text-embedding-3-large",
  resourceName: "https://customer-resource.openai.azure.com",
  deployment: "embeddings",
  apiKey: "key",
} as const;

const AZURE_EMBEDDING_MESSAGE =
  "Customer Azure OpenAI embeddings aren't available in this region yet. Use the managed embedding model (MANAGED_OPENAI).";

beforeEach(() => {
  mocks.createNamespace.mockReset();
  mocks.createNamespace.mockImplementation(({ data }) =>
    Promise.resolve({ id: "ns_1", ...data }),
  );
  mocks.getNamespaceVectorStore.mockReset();
  mocks.getNamespaceEmbeddingModel.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("@agentset/db/client");
  vi.doUnmock("@agentset/engine");
});

describe("createNamespaceSchema", () => {
  it("defaults to managed configs on us", async () => {
    const { schemas } = await load("us");

    expect(
      schemas.createNamespaceSchema.parse({ name: "Docs", slug: "docs" }),
    ).toEqual({
      name: "Docs",
      slug: "docs",
      embeddingConfig: MANAGED_EMBEDDING,
      vectorStoreConfig: { provider: "MANAGED_TURBOPUFFER" },
    });
  });

  it.each([undefined, { provider: "MANAGED_TURBOPUFFER" }])(
    "requires your own vector store on eu (%j)",
    async (vectorStoreConfig) => {
      const { schemas } = await load("eu");

      const result = schemas.createNamespaceSchema.safeParse({
        name: "Docs",
        slug: "docs",
        vectorStoreConfig,
      });

      expect(result.error?.issues).toHaveLength(1);
      expect(result.error?.issues[0]?.path[0]).toBe("vectorStoreConfig");
      expect(result.error?.issues[0]?.message).toBe(BYO_MESSAGE);
    },
  );

  it("accepts your own EU Turbopuffer store on eu", async () => {
    const { schemas } = await load("eu");

    expect(
      schemas.createNamespaceSchema.parse({
        name: "Docs",
        slug: "docs",
        vectorStoreConfig: TURBOPUFFER_EU,
      }),
    ).toEqual({
      name: "Docs",
      slug: "docs",
      embeddingConfig: MANAGED_EMBEDDING,
      vectorStoreConfig: TURBOPUFFER_EU,
    });
  });

  it("rejects US-hosted embedding providers on eu", async () => {
    const { schemas } = await load("eu");

    const result = schemas.createNamespaceSchema.safeParse({
      name: "Docs",
      slug: "docs",
      embeddingConfig: OPENAI_EMBEDDING,
      vectorStoreConfig: TURBOPUFFER_EU,
    });

    expect(result.error?.issues[0]?.path).toEqual([
      "embeddingConfig",
      "provider",
    ]);
  });

  it("accepts your own Azure OpenAI resource on us", async () => {
    const { schemas } = await load("us");

    expect(
      schemas.createNamespaceSchema.parse({
        name: "Docs",
        slug: "docs",
        embeddingConfig: AZURE_EMBEDDING,
      }).embeddingConfig,
    ).toEqual({ ...AZURE_EMBEDDING, apiVersion: "preview" });
  });

  it("rejects your own Azure OpenAI resource on eu", async () => {
    const { schemas } = await load("eu");

    const result = schemas.createNamespaceSchema.safeParse({
      name: "Docs",
      slug: "docs",
      embeddingConfig: AZURE_EMBEDDING,
      vectorStoreConfig: TURBOPUFFER_EU,
    });

    expect(result.error?.issues).toHaveLength(1);
    expect(result.error?.issues[0]?.path).toEqual([
      "embeddingConfig",
      "provider",
    ]);
    expect(result.error?.issues[0]?.message).toBe(AZURE_EMBEDDING_MESSAGE);
  });

  it("keeps the update schema on eu", async () => {
    const { schemas } = await load("eu");

    expect(schemas.updateNamespaceSchema.parse({ name: "Docs" })).toEqual({
      name: "Docs",
    });
  });
});

describe("createNamespace", () => {
  it("stores only the name, slug and organization on us", async () => {
    const { create } = await load("us");

    await create.createNamespace({
      name: "Docs",
      slug: "docs",
      organizationId: "org_1",
      embeddingConfig: MANAGED_EMBEDDING,
      vectorStoreConfig: { provider: "MANAGED_TURBOPUFFER" },
    });

    expect(mocks.createNamespace).toHaveBeenCalledWith({
      data: { name: "Docs", slug: "docs", organizationId: "org_1" },
    });
    expect(Object.keys(mocks.createNamespace.mock.calls[0]![0].data)).toEqual([
      "name",
      "slug",
      "organizationId",
    ]);
  });

  it("stores the embedding and vector store configs on eu", async () => {
    const { create } = await load("eu");

    await create.createNamespace({
      name: "Docs",
      slug: "docs",
      organizationId: "org_1",
      embeddingConfig: MANAGED_EMBEDDING,
      vectorStoreConfig: TURBOPUFFER_EU,
    });

    expect(mocks.createNamespace).toHaveBeenCalledWith({
      data: {
        name: "Docs",
        slug: "docs",
        organizationId: "org_1",
        embeddingConfig: MANAGED_EMBEDDING,
        vectorStoreConfig: TURBOPUFFER_EU,
      },
    });
  });

  it.each([
    [undefined, MANAGED_EMBEDDING],
    [{ provider: "MANAGED_TURBOPUFFER" }, MANAGED_EMBEDDING],
    [{ provider: "MANAGED_PINECONE" }, MANAGED_EMBEDDING],
    [{ ...TURBOPUFFER_EU, region: "aws-us-east-1" }, MANAGED_EMBEDDING],
    [TURBOPUFFER_EU, OPENAI_EMBEDDING],
    [TURBOPUFFER_EU, AZURE_EMBEDDING],
  ] as const)(
    "rejects %j with %j on eu",
    async (vectorStoreConfig, embeddingConfig) => {
      const { create, errors } = await load("eu");

      const result = create.createNamespace({
        name: "Docs",
        slug: "docs",
        organizationId: "org_1",
        embeddingConfig,
        vectorStoreConfig,
      });

      await expect(result).rejects.toBeInstanceOf(errors.AgentsetApiError);
      await expect(result).rejects.toMatchObject({ code: "bad_request" });
      expect(mocks.createNamespace).not.toHaveBeenCalled();
    },
  );
});

describe("namespace config validation", () => {
  it("accepts the managed Turbopuffer store on us", async () => {
    const { validate } = await load("us");

    await expect(
      validate.validateVectorStoreConfig(
        { provider: "MANAGED_TURBOPUFFER" },
        MANAGED_EMBEDDING,
      ),
    ).resolves.toEqual({ success: true });
    expect(mocks.getNamespaceVectorStore).not.toHaveBeenCalled();
  });

  it.each([
    { provider: "MANAGED_TURBOPUFFER" },
    { provider: "MANAGED_PINECONE" },
    { provider: "MANAGED_PINECONE_OLD" },
  ] as const)("rejects %j on eu", async (vectorStoreConfig) => {
    const { validate } = await load("eu");

    await expect(
      validate.validateVectorStoreConfig(vectorStoreConfig, MANAGED_EMBEDDING),
    ).resolves.toEqual({ success: false, error: BYO_MESSAGE });
    expect(mocks.getNamespaceVectorStore).not.toHaveBeenCalled();
  });

  it("checks your own store's dimensions on eu", async () => {
    mocks.getNamespaceVectorStore.mockResolvedValue({
      getDimensions: () => Promise.resolve(3072),
    });
    const { validate } = await load("eu");

    await expect(
      validate.validateVectorStoreConfig(TURBOPUFFER_EU, MANAGED_EMBEDDING),
    ).resolves.toEqual({ success: true });
  });

  it("rejects US-hosted embedding providers on eu", async () => {
    const { validate } = await load("eu");

    const result = await validate.validateEmbeddingModel(OPENAI_EMBEDDING);

    expect(result.success).toBe(false);
    expect(mocks.getNamespaceEmbeddingModel).not.toHaveBeenCalled();
  });

  it("rejects your own Azure OpenAI resource on eu", async () => {
    const { validate } = await load("eu");

    await expect(
      validate.validateEmbeddingModel(AZURE_EMBEDDING),
    ).resolves.toEqual({ success: false, error: AZURE_EMBEDDING_MESSAGE });
    expect(mocks.getNamespaceEmbeddingModel).not.toHaveBeenCalled();
  });
});
