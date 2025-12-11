import { z } from "zod/v4";

import { AzureEmbeddingConfigSchema } from "./azure";
import { GoogleEmbeddingConfigSchema } from "./google";
import {
  OpenAIEmbeddingConfigSchema,
  openaiEmbeddingModelEnum,
} from "./openai";
import { VoyageEmbeddingConfigSchema } from "./voyage";

export type EmbeddingConfig = z.infer<typeof EmbeddingConfigSchema>;
export * from "./azure";
export * from "./google";
export * from "./openai";
export * from "./voyage";

export const EmbeddingConfigSchema = z
  .discriminatedUnion("provider", [
    OpenAIEmbeddingConfigSchema,
    AzureEmbeddingConfigSchema,
    VoyageEmbeddingConfigSchema,
    GoogleEmbeddingConfigSchema,
    z.object({
      provider: z.literal("MANAGED_OPENAI"),
      model: openaiEmbeddingModelEnum.extract(["text-embedding-3-large"]),
    }),
  ])
  .meta({
    id: "embedding-model-config",
    description:
      "The embedding model config. If not provided, our managed embedding model will be used. Note: You can't change the embedding model config after the namespace is created.",
  });
