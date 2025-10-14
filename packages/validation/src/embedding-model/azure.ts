import { z } from "zod/v4";

import { openaiEmbeddingModelEnum } from "./openai";

export const AzureEmbeddingConfigSchema = z
  .object({
    provider: z.literal("AZURE_OPENAI"),
    model: openaiEmbeddingModelEnum,
    resourceName: z.url().meta({
      description:
        "The resource name of the Azure OpenAI API. https://{resourceName}.openai.azure.com/v1",
      examples: ["my-resource-name"],
    }),
    deployment: z
      .string()
      .describe("The deployment name of the Azure OpenAI API."),
    apiKey: z.string().describe("The API key for the Azure OpenAI API."),
    apiVersion: z
      .string()
      .describe(
        "The API version for the Azure OpenAI API. Defaults to `preview`.",
      )
      .default("preview")
      .optional(),
  })
  .meta({
    id: "azure-embedding-config",
    title: "Azure Embedding Config",
  });
