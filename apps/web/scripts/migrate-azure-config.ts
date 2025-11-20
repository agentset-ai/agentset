import z from "zod/v4";

import { Prisma } from "@agentset/db";
import { db } from "@agentset/db/client";
import { openaiEmbeddingModelEnum } from "@agentset/validation";

/**
 * this is not used anymore, it was use
 * @deprecated
 */
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

/**
 * example: "https://xxx.cognitiveservices.azure.com/openai/deployments" -> "xxx"
 * @param baseUrl - The base URL of the Azure OpenAI API.
 * @returns The resource name of the Azure OpenAI API.
 */
const transformBaseUrlToResourceName = (baseUrl: string) => {
  return baseUrl.replace("https://", "").replace("http://", "").split(".")[0]!;
};

const namespacesWithAzure = await db.namespace.findMany({
  where: {
    embeddingConfig: {
      not: Prisma.AnyNull,
      path: ["provider"],
      equals: "AZURE_OPENAI",
    },
  },
});

console.log(`Found ${namespacesWithAzure.length} namespaces with Azure config`);
let i = 0;
for (const namespace of namespacesWithAzure) {
  console.log(
    `[${++i} / ${namespacesWithAzure.length}] Migrating namespace ${namespace.id}`,
  );

  const embeddingConfig = namespace.embeddingConfig as unknown as z.infer<
    typeof _OldAzureEmbeddingConfigSchema
  >;
  if (!embeddingConfig || embeddingConfig.provider !== "AZURE_OPENAI") {
    continue;
  }

  const newConfig: PrismaJson.NamespaceEmbeddingConfig = {
    provider: "AZURE_OPENAI",
    model: embeddingConfig.model,
    resourceName: transformBaseUrlToResourceName(embeddingConfig.baseUrl),
    deployment: embeddingConfig.deployment,
    apiKey: embeddingConfig.apiKey,
    apiVersion: "preview",
  };

  await db.namespace.update({
    where: { id: namespace.id },
    data: {
      embeddingConfig: newConfig,
    },
  });
}

console.log("Done!");
