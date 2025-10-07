import { EmbeddingModel } from "ai";
import { VoyageEmbeddingOptions } from "voyage-ai-provider";

import type { Namespace } from "@agentset/db";

import { env } from "../env";

const getEmbeddingProviderOptions = (
  namespace: Pick<Namespace, "embeddingConfig">,
  type: "document" | "query",
) => {
  return {
    ...(namespace.embeddingConfig?.provider === "VOYAGE" && {
      voyage: {
        inputType: type,
      } satisfies VoyageEmbeddingOptions,
    }),
  };
};

export const getNamespaceEmbeddingModel = async (
  namespace: Pick<Namespace, "embeddingConfig">,
  type: "document" | "query" = "query",
): Promise<
  EmbeddingModel & {
    providerOptions?: ReturnType<typeof getEmbeddingProviderOptions>;
  }
> => {
  const config = namespace.embeddingConfig;
  let model: EmbeddingModel;

  if (!config) {
    const { createAzure } = await import("@ai-sdk/azure");

    const defaultAzure = createAzure({
      resourceName: env.DEFAULT_AZURE_RESOURCE_NAME,
      apiKey: env.DEFAULT_AZURE_API_KEY,
      apiVersion: "preview",
    });

    model = defaultAzure.textEmbeddingModel(
      env.DEFAULT_AZURE_EMBEDDING_DEPLOYMENT,
    );
  } else {
    switch (config.provider) {
      case "AZURE_OPENAI": {
        const { createAzure } = await import("@ai-sdk/azure");

        const { apiKey, resourceName, deployment, apiVersion } = config;
        const azure = createAzure({
          resourceName,
          apiKey,
          apiVersion,
        });
        model = azure.textEmbeddingModel(deployment);
        break;
      }

      case "OPENAI": {
        const { createOpenAI } = await import("@ai-sdk/openai");

        const { apiKey, model: modelName } = config;
        const openai = createOpenAI({ apiKey });
        model = openai.textEmbeddingModel(modelName);
        break;
      }

      case "VOYAGE": {
        const { createVoyage } = await import("voyage-ai-provider");

        const { apiKey, model: modelName } = config;
        const voyage = createVoyage({ apiKey });
        model = voyage.textEmbeddingModel(modelName);
        break;
      }

      case "GOOGLE": {
        const { createGoogleGenerativeAI } = await import("@ai-sdk/google");

        const { apiKey, model: modelName } = config;
        const google = createGoogleGenerativeAI({ apiKey });
        model = google.textEmbeddingModel(modelName);
        break;
      }

      default: {
        // This exhaustive check ensures TypeScript will error if a new provider
        // is added without handling it in the switch statement
        const _exhaustiveCheck: never = config;
        throw new Error(`Unknown vector store provider: ${_exhaustiveCheck}`);
      }
    }
  }

  model.doEmbed = (options) =>
    model.doEmbed({
      ...options,
      providerOptions: {
        ...options.providerOptions,
        ...getEmbeddingProviderOptions(namespace, type),
      },
    });

  return model;
};
