import { env } from "@/env";

import type { Namespace } from "@agentset/db";

export const getNamespaceEmbeddingModel = async (
  namespace: Pick<Namespace, "embeddingConfig">,
  type?: "document" | "query",
) => {
  const config = namespace.embeddingConfig;

  if (!config) {
    const { createAzure } = await import("@ai-sdk/azure");

    const defaultAzure = createAzure({
      baseURL: env.DEFAULT_AZURE_BASE_URL,
      apiKey: env.DEFAULT_AZURE_API_KEY,
      apiVersion: env.DEFAULT_AZURE_TEXT_3_LARGE_EMBEDDING_VERSION,
    });

    return defaultAzure.textEmbeddingModel(
      env.DEFAULT_AZURE_TEXT_3_LARGE_EMBEDDING_DEPLOYMENT,
    );
  }

  switch (config.provider) {
    case "AZURE_OPENAI": {
      const { createAzure } = await import("@ai-sdk/azure");

      const { apiKey, baseUrl, deployment, apiVersion } = config;
      const azure = createAzure({
        apiKey,
        apiVersion,
        baseURL: baseUrl,
      });
      return azure.textEmbeddingModel(deployment);
    }

    case "OPENAI": {
      const { createOpenAI } = await import("@ai-sdk/openai");

      const { apiKey, model } = config;
      const openai = createOpenAI({ apiKey });
      return openai.textEmbeddingModel(model);
    }

    case "VOYAGE": {
      const { createVoyage } = await import("voyage-ai-provider");

      const { apiKey, model } = config;
      const voyage = createVoyage({ apiKey });
      return voyage.textEmbeddingModel(model, {
        inputType: type === "document" ? "document" : "query",
      });
    }

    case "GOOGLE": {
      const { createGoogleGenerativeAI } = await import("@ai-sdk/google");

      const { apiKey, model } = config;
      const google = createGoogleGenerativeAI({ apiKey });
      return google.textEmbeddingModel(model);
    }

    default: {
      // This exhaustive check ensures TypeScript will error if a new provider
      // is added without handling it in the switch statement
      const _exhaustiveCheck: never = config;
      throw new Error(`Unknown vector store provider: ${_exhaustiveCheck}`);
    }
  }
};
