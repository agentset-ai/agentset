import { embed } from "ai";

import type { Namespace } from "@agentset/db";
import {
  getNamespaceEmbeddingModel,
  getNamespaceVectorStore,
} from "@agentset/engine";

const modelToDimensions: Record<
  PrismaJson.NamespaceEmbeddingConfig["model"],
  number
> = {
  // openai
  "text-embedding-3-large": 3072,
  "text-embedding-3-small": 1536,

  // google
  "text-embedding-004": 768,

  // voyage
  "voyage-3-large": 1024,
  "voyage-3": 1024,
  "voyage-3-lite": 512,
  "voyage-code-3": 1024,
  "voyage-finance-2": 1024,
  "voyage-law-2": 1024,
};

export const validateVectorStoreConfig = async (
  vectorStoreConfig?: Namespace["vectorStoreConfig"],
  embeddingConfig?: Namespace["embeddingConfig"],
) => {
  if (!vectorStoreConfig) {
    return {
      success: true as const,
    };
  }

  const v = await getNamespaceVectorStore({
    id: "",
    vectorStoreConfig,
    createdAt: new Date(),
  });

  try {
    const dimensions = await v.getDimensions();
    if (embeddingConfig) {
      const embeddingDimensions = modelToDimensions[embeddingConfig.model];
      if (dimensions !== embeddingDimensions) {
        return {
          success: false as const,
          error: `Embedding dimensions mismatch: ${dimensions} !== ${embeddingDimensions}`,
        };
      }
    }

    return {
      success: true as const,
    };
  } catch {
    return {
      success: false as const,
      error:
        "Failed to validate vector store config, make sure the API key is valid",
    };
  }
};

export const validateEmbeddingModel = async (
  embeddingConfig?: Namespace["embeddingConfig"],
) => {
  if (!embeddingConfig) {
    return {
      success: true as const,
    };
  }

  const model = await getNamespaceEmbeddingModel({ embeddingConfig });

  try {
    await embed({
      model,
      value: "Hello, world!",
    });

    return {
      success: true as const,
    };
  } catch {
    return {
      success: false as const,
      error:
        "Failed to validate embedding model, make sure the API key is valid",
    };
  }
};
