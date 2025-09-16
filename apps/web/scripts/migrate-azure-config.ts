import z from "zod/v4";

import { db, Prisma } from "@agentset/db";
import { _OldAzureEmbeddingConfigSchema } from "@agentset/validation";

/**
 * example: "https://xxx.cognitiveservices.azure.com/openai/deployments" -> "xxx"
 * @param baseUrl - The base URL of the Azure OpenAI API.
 * @returns The resource name of the Azure OpenAI API.
 */
const transformBaseUrlToResourceName = (baseUrl: string) => {
  return baseUrl.replace("https://", "").replace("http://", "").split(".")[0]!;
};

export const migrateAzureConfig = async () => {
  const namespacesWithAzure = await db.namespace.findMany({
    where: {
      embeddingConfig: {
        not: Prisma.AnyNull,
        path: ["provider"],
        equals: "AZURE_OPENAI",
      },
    },
  });

  for (const namespace of namespacesWithAzure) {
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
};
