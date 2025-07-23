import { z } from "zod/v4";

import { openaiEmbeddingModelEnum } from "./openai";

export const AzureEmbeddingConfigSchema = z
  .object({
    provider: z.literal("AZURE_OPENAI"),
    model: openaiEmbeddingModelEnum,
    baseUrl: z.url().describe("The base URL of the Azure OpenAI API.").meta({
      example: `https://example.openai.azure.com/openai/deployments`,
    }),
    deployment: z
      .string()
      .describe("The deployment name of the Azure OpenAI API."),
    apiKey: z.string().describe("The API key for the Azure OpenAI API."),
    apiVersion: z
      .string()
      .optional()
      .describe("The API version for the Azure OpenAI API."),
  })
  .meta({
    title: "Azure Embedding Config",
  });
