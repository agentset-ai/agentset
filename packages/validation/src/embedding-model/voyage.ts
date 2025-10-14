import { z } from "zod/v4";

export const voyageEmbeddingModelEnum = z
  .enum([
    "voyage-3-large",
    "voyage-3",
    "voyage-3-lite",
    "voyage-code-3",
    "voyage-finance-2",
    "voyage-law-2",
  ])
  .meta({
    id: "voyage-embedding-model-enum",
    description: "The Voyage embedding model enum.",
  });

export const VoyageEmbeddingConfigSchema = z
  .object({
    provider: z.literal("VOYAGE"),
    model: voyageEmbeddingModelEnum,
    apiKey: z.string(),
  })
  .meta({
    id: "voyage-embedding-config",
    title: "Voyage Embedding Config",
  });
