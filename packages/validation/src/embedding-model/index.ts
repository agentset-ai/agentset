import { z } from "zod/v4";

import { AzureEmbeddingConfigSchema } from "./azure";
import { GoogleEmbeddingConfigSchema } from "./google";
import { OpenAIEmbeddingConfigSchema } from "./openai";
import { VoyageEmbeddingConfigSchema } from "./voyage";

export const EmbeddingConfigSchema = z
  .discriminatedUnion("provider", [
    OpenAIEmbeddingConfigSchema,
    AzureEmbeddingConfigSchema,
    VoyageEmbeddingConfigSchema,
    GoogleEmbeddingConfigSchema,
  ])
  .describe(
    "The embedding model config. If not provided, our managed embedding model will be used. Note: You can't change the embedding model config after the namespace is created.",
  );

export type EmbeddingConfig = z.infer<typeof EmbeddingConfigSchema>;

export { AzureEmbeddingConfigSchema } from "./azure";
export { GoogleEmbeddingConfigSchema } from "./google";
export { OpenAIEmbeddingConfigSchema } from "./openai";
export { VoyageEmbeddingConfigSchema } from "./voyage";
