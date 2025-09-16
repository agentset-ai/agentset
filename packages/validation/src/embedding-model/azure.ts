import { z } from "zod/v4";

import { openaiEmbeddingModelEnum } from "./openai";

export const _OldAzureEmbeddingConfigSchema = z
  .object({
    provider: z.literal("AZURE_OPENAI"),
    model: openaiEmbeddingModelEnum,
    baseUrl: z
      .url()
      .describe(
        "The resource name of the Azure OpenAI API. https://{resourceName}.openai.azure.com/v1",
      )
      .meta({
        example: `my-resource-name`,
      }),
    deployment: z
      .string()
      .describe("The deployment name of the Azure OpenAI API."),
    apiKey: z.string().describe("The API key for the Azure OpenAI API."),
    apiVersion: z
      .string()
      .optional()
      .describe(
        "The API version for the Azure OpenAI API. Defaults to `preview`.",
      ),
  })
  .meta({
    title: "Azure Embedding Config",
  });

export const AzureEmbeddingConfigSchema = z
  .object({
    provider: z.literal("AZURE_OPENAI"),
    model: openaiEmbeddingModelEnum,
    resourceName: z
      .url()
      .describe(
        "The resource name of the Azure OpenAI API. https://{resourceName}.openai.azure.com/v1",
      )
      .meta({
        example: `my-resource-name`,
      }),
    deployment: z
      .string()
      .describe("The deployment name of the Azure OpenAI API."),
    apiKey: z.string().describe("The API key for the Azure OpenAI API."),
    apiVersion: z
      .string()
      .default("preview")
      .optional()
      .describe(
        "The API version for the Azure OpenAI API. Defaults to `preview`.",
      ),
  })
  .meta({
    title: "Azure Embedding Config",
  });
