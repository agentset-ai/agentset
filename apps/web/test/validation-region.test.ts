import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";

import { importForRegion } from "./helpers/region";

const importValidation = (region: "us" | "eu") =>
  importForRegion(region, () => import("@agentset/validation"));

afterEach(() => {
  vi.unstubAllEnvs();
});

const ALL_LLMS = [
  "openai:gpt-4.1",
  "openai:gpt-5.5",
  "openai:gpt-5.2",
  "openai:gpt-5.1",
  "openai:gpt-5",
  "openai:gpt-5-mini",
  "openai:gpt-5-nano",
];

const EU_LLMS = [
  "openai:gpt-5.5",
  "openai:gpt-4.1",
  "openai:gpt-5-mini",
  "openai:gpt-5-nano",
];

const ALL_RERANKERS = [
  "cohere:rerank-v4.0-pro",
  "cohere:rerank-v4.0-fast",
  "cohere:rerank-v3.5",
  "cohere:rerank-english-v3.0",
  "cohere:rerank-multilingual-v3.0",
  "zeroentropy:zerank-2",
  "zeroentropy:zerank-1",
  "zeroentropy:zerank-1-small",
];

const EU_RERANKERS = ["cohere:rerank-v4.0-pro", "cohere:rerank-v4.0-fast"];

const EU_TURBOPUFFER_REGIONS = [
  "aws-eu-central-1",
  "aws-eu-west-1",
  "gcp-europe-west3",
  "gcp-europe-west1",
];

const US_HOSTED_EMBEDDINGS = [
  { provider: "OPENAI", model: "text-embedding-3-small", apiKey: "key" },
  { provider: "VOYAGE", model: "voyage-3", apiKey: "key" },
  { provider: "GOOGLE", model: "text-embedding-004", apiKey: "key" },
];

const MANAGED_EMBEDDING = {
  provider: "MANAGED_OPENAI",
  model: "text-embedding-3-large",
};

const AZURE_EMBEDDING = {
  provider: "AZURE_OPENAI",
  model: "text-embedding-3-large",
  resourceName: "https://customer-resource.openai.azure.com",
  deployment: "embeddings",
  apiKey: "key",
};

const issuesOf = (result: { success: boolean; error?: z.ZodError }) =>
  result.error?.issues.map(({ path, message }) => ({ path, message }));

describe("llmSchema", () => {
  it("accepts every model on us", async () => {
    const { llmSchema, isLLMAvailable, llmSchemaWithDefault } =
      await importValidation("us");

    expect(llmSchema.options).toEqual(ALL_LLMS);
    for (const model of ALL_LLMS) {
      expect(llmSchema.safeParse(model).success).toBe(true);
      expect(isLLMAvailable(model)).toBe(true);
    }
    expect(llmSchemaWithDefault.parse(undefined)).toBe("openai:gpt-5.5");
  });

  it("accepts only the EU models on eu", async () => {
    const { llmSchema, isLLMAvailable, llmSchemaWithDefault } =
      await importValidation("eu");

    expect([...llmSchema.options].sort()).toEqual([...EU_LLMS].sort());
    for (const model of EU_LLMS) {
      expect(llmSchema.safeParse(model).success).toBe(true);
      expect(isLLMAvailable(model)).toBe(true);
    }
    expect(llmSchemaWithDefault.parse(undefined)).toBe("openai:gpt-5.5");
  });

  it.each(["openai:gpt-5", "openai:gpt-5.1", "openai:gpt-5.2"])(
    "rejects %s on eu with the available models",
    async (model) => {
      const { llmSchema, isLLMAvailable } = await importValidation("eu");

      const result = llmSchema.safeParse(model);

      expect(isLLMAvailable(model)).toBe(false);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe(
        `This model isn't available in this region. Use one of: ${EU_LLMS.join(", ")}`,
      );
    },
  );
});

describe("rerankerSchema", () => {
  it("accepts every reranker on us", async () => {
    const { rerankerSchema, isRerankingModelAvailable } =
      await importValidation("us");

    expect(rerankerSchema.options).toEqual(ALL_RERANKERS);
    for (const model of ALL_RERANKERS) {
      expect(isRerankingModelAvailable(model)).toBe(true);
    }
  });

  it("accepts only the EU rerankers on eu", async () => {
    const {
      rerankerSchema,
      rerankerSchemaWithDefault,
      isRerankingModelAvailable,
    } = await importValidation("eu");

    expect([...rerankerSchema.options].sort()).toEqual(
      [...EU_RERANKERS].sort(),
    );
    expect(rerankerSchemaWithDefault.parse(undefined)).toBe(
      "cohere:rerank-v4.0-pro",
    );
    for (const model of ALL_RERANKERS) {
      expect(isRerankingModelAvailable(model)).toBe(
        EU_RERANKERS.includes(model),
      );
    }
  });

  it.each([
    "zeroentropy:zerank-2",
    "zeroentropy:zerank-1-small",
    "cohere:rerank-v3.5",
  ])("rejects %s on eu with the available models", async (model) => {
    const { rerankerSchema } = await importValidation("eu");

    expect(rerankerSchema.safeParse(model).error?.issues[0]?.message).toBe(
      `This reranking model isn't available in this region. Use one of: ${EU_RERANKERS.join(", ")}`,
    );
  });
});

describe("EmbeddingConfigSchema", () => {
  it.each([...US_HOSTED_EMBEDDINGS, AZURE_EMBEDDING, MANAGED_EMBEDDING])(
    "accepts $provider on us",
    async (config) => {
      const {
        EmbeddingConfigSchema,
        getEmbeddingRegionIssue,
        isEmbeddingProviderAvailable,
      } = await importValidation("us");

      expect(EmbeddingConfigSchema.safeParse(config).success).toBe(true);
      expect(isEmbeddingProviderAvailable(config.provider)).toBe(true);
      expect(getEmbeddingRegionIssue(config)).toBeUndefined();
    },
  );

  it("accepts the managed model on eu", async () => {
    const { EmbeddingConfigSchema, isEmbeddingProviderAvailable } =
      await importValidation("eu");

    expect(EmbeddingConfigSchema.safeParse(MANAGED_EMBEDDING).success).toBe(
      true,
    );
    expect(isEmbeddingProviderAvailable("MANAGED_OPENAI")).toBe(true);
  });

  it("rejects your own Azure OpenAI resource on eu", async () => {
    const { EmbeddingConfigSchema, isEmbeddingProviderAvailable } =
      await importValidation("eu");

    const issues = issuesOf(EmbeddingConfigSchema.safeParse(AZURE_EMBEDDING));

    expect(isEmbeddingProviderAvailable("AZURE_OPENAI")).toBe(false);
    expect(issues).toEqual([
      {
        path: ["provider"],
        message:
          "Customer Azure OpenAI embeddings aren't available in this region yet. Use the managed embedding model (MANAGED_OPENAI).",
      },
    ]);
  });

  it.each(US_HOSTED_EMBEDDINGS)(
    "rejects $provider on eu naming the managed model",
    async (config) => {
      const { EmbeddingConfigSchema, isEmbeddingProviderAvailable } =
        await importValidation("eu");

      const issues = issuesOf(EmbeddingConfigSchema.safeParse(config));

      expect(isEmbeddingProviderAvailable(config.provider)).toBe(false);
      expect(issues).toEqual([
        {
          path: ["provider"],
          message:
            "OpenAI, Voyage and Google embeddings aren't available in this region. Use the managed embedding model (MANAGED_OPENAI).",
        },
      ]);
    },
  );
});

describe("createVectorStoreSchema", () => {
  const BYO_MESSAGE =
    "EU namespaces need your own Turbopuffer or Pinecone credentials";

  it("accepts managed stores and every Turbopuffer region on us", async () => {
    const { createVectorStoreSchema, isTurbopufferRegionAvailable } =
      await importValidation("us");

    for (const provider of ["MANAGED_PINECONE", "MANAGED_TURBOPUFFER"]) {
      expect(createVectorStoreSchema.safeParse({ provider }).success).toBe(
        true,
      );
    }
    for (const region of ["aws-us-east-1", ...EU_TURBOPUFFER_REGIONS]) {
      expect(
        createVectorStoreSchema.safeParse({
          provider: "TURBOPUFFER",
          apiKey: "key",
          region,
        }).success,
      ).toBe(true);
      expect(isTurbopufferRegionAvailable(region)).toBe(true);
    }
  });

  it("keeps the us OpenAPI description", async () => {
    const { createVectorStoreSchema } = await importValidation("us");

    expect(z.toJSONSchema(createVectorStoreSchema).description).toBe(
      "The vector store config. If not provided, our MANAGED_PINECONE vector store will be used. Note: You can't change the vector store config after the namespace is created.",
    );
  });

  it.each([
    { provider: "MANAGED_PINECONE" },
    { provider: "MANAGED_TURBOPUFFER" },
    { provider: "MANAGED_PINECONE_OLD" },
    undefined,
  ])("rejects %j on eu", async (config) => {
    const { createVectorStoreSchema } = await importValidation("eu");

    const issues = issuesOf(createVectorStoreSchema.safeParse(config));

    expect(issues).toHaveLength(1);
    expect(issues?.[0]?.message).toBe(BYO_MESSAGE);
  });

  it.each(EU_TURBOPUFFER_REGIONS)(
    "accepts the %s Turbopuffer region on eu",
    async (region) => {
      const { createVectorStoreSchema, isTurbopufferRegionAvailable } =
        await importValidation("eu");

      expect(
        createVectorStoreSchema.safeParse({
          provider: "TURBOPUFFER",
          apiKey: "key",
          region,
        }).success,
      ).toBe(true);
      expect(isTurbopufferRegionAvailable(region)).toBe(true);
    },
  );

  it.each(["aws-us-east-1", "gcp-us-central1", "aws-ap-south-1"])(
    "rejects the %s Turbopuffer region on eu",
    async (region) => {
      const { createVectorStoreSchema, isTurbopufferRegionAvailable } =
        await importValidation("eu");

      const issues = issuesOf(
        createVectorStoreSchema.safeParse({
          provider: "TURBOPUFFER",
          apiKey: "key",
          region,
        }),
      );

      expect(isTurbopufferRegionAvailable(region)).toBe(false);
      expect(issues).toEqual([
        {
          path: ["region"],
          message: `EU namespaces need a Turbopuffer region in the EU: ${EU_TURBOPUFFER_REGIONS.join(", ")}`,
        },
      ]);
    },
  );

  it("accepts Pinecone on eu", async () => {
    const { createVectorStoreSchema } = await importValidation("eu");

    expect(
      createVectorStoreSchema.safeParse({
        provider: "PINECONE",
        apiKey: "key",
        indexHost: "https://customer.svc.pinecone.io",
      }).success,
    ).toBe(true);
  });

  it.each(["us", "eu"] as const)(
    "still reads stored managed configs on %s",
    async (region) => {
      const { VectorStoreSchema } = await importValidation(region);

      for (const provider of [
        "MANAGED_PINECONE_OLD",
        "MANAGED_PINECONE",
        "MANAGED_TURBOPUFFER",
      ]) {
        expect(VectorStoreSchema.safeParse({ provider }).success).toBe(true);
      }
    },
  );
});

describe("Turbopuffer regions", () => {
  it.each(["us", "eu"] as const)(
    "include gcp-europe-west1 on %s",
    async (region) => {
      const { TurbopufferVectorStoreConfigSchema } =
        await importValidation(region);

      expect(TurbopufferVectorStoreConfigSchema.shape.region.options).toContain(
        "gcp-europe-west1",
      );
    },
  );
});
