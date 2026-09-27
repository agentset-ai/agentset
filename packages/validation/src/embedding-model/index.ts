import { z } from "zod/v4";

import { isEuRegion, REGION_FEATURES } from "@agentset/utils";

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

const US_HOSTED_EMBEDDING_PROVIDERS: readonly string[] = [
  OpenAIEmbeddingConfigSchema.shape.provider.value,
  VoyageEmbeddingConfigSchema.shape.provider.value,
  GoogleEmbeddingConfigSchema.shape.provider.value,
];

const AZURE_EMBEDDING_PROVIDER: string =
  AzureEmbeddingConfigSchema.shape.provider.value;

/**
 * Whether the embedding provider can be used in this region. On EU only the
 * managed model is available.
 */
export const isEmbeddingProviderAvailable = (provider: string) => {
  if (US_HOSTED_EMBEDDING_PROVIDERS.includes(provider)) {
    return REGION_FEATURES.usHostedEmbeddingProviders;
  }

  if (provider === AZURE_EMBEDDING_PROVIDER) {
    return REGION_FEATURES.customerAzureEmbeddings;
  }

  return true;
};

export const getEmbeddingRegionIssue = (config: { provider: string }) => {
  if (isEmbeddingProviderAvailable(config.provider)) return undefined;

  return config.provider === AZURE_EMBEDDING_PROVIDER
    ? "Customer Azure OpenAI embeddings aren't available in this region yet. Use the managed embedding model (MANAGED_OPENAI)."
    : "OpenAI, Voyage and Google embeddings aren't available in this region. Use the managed embedding model (MANAGED_OPENAI).";
};

const embeddingConfigSchema = z.discriminatedUnion("provider", [
  OpenAIEmbeddingConfigSchema,
  AzureEmbeddingConfigSchema,
  VoyageEmbeddingConfigSchema,
  GoogleEmbeddingConfigSchema,
  z.object({
    provider: z.literal("MANAGED_OPENAI"),
    model: openaiEmbeddingModelEnum.extract(["text-embedding-3-large"]),
  }),
]);

export const EmbeddingConfigSchema = (
  isEuRegion
    ? embeddingConfigSchema.check((ctx) => {
        const issue = getEmbeddingRegionIssue(ctx.value);
        if (issue) {
          ctx.issues.push({
            code: "custom",
            message: issue,
            input: ctx.value,
            path: ["provider"],
          });
        }
      })
    : embeddingConfigSchema
).meta({
  id: "embedding-model-config",
  description:
    "The embedding model config. If not provided, our managed embedding model will be used. Note: You can't change the embedding model config after the namespace is created.",
});
