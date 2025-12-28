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
  vectorStoreConfig: NonNullable<Namespace["vectorStoreConfig"]>,
  embeddingConfig: NonNullable<Namespace["embeddingConfig"]>,
) => {
  // TODO: make this dynamic
  const embeddingDimensions: number = modelToDimensions[embeddingConfig.model];

  // one of either vector store config or embedding config is provided
  // TODO: make this dynamic
  let vectorStoreDimensions: number;
  if (vectorStoreConfig.provider === "MANAGED_TURBOPUFFER") {
    vectorStoreDimensions = embeddingDimensions;
  } else {
    try {
      const v = await getNamespaceVectorStore({ id: "", vectorStoreConfig });
      const dimensions = await v.getDimensions();
      vectorStoreDimensions =
        dimensions === "ANY" ? embeddingDimensions : (dimensions as number);
    } catch {
      return {
        success: false as const,
        error:
          "Failed to validate vector store config, make sure the API key is valid",
      };
    }
  }

  if (vectorStoreDimensions !== embeddingDimensions) {
    return {
      success: false as const,
      error: `Embedding dimensions mismatch: ${vectorStoreDimensions} !== ${embeddingDimensions}`,
    };
  }

  return {
    success: true as const,
  };
};

export const validateEmbeddingModel = async (
  embeddingConfig: NonNullable<Namespace["embeddingConfig"]>,
) => {
  // if (embeddingConfig.provider.startsWith("MANAGED_")) {
  //   return {
  //     success: true as const,
  //   };
  // }

  const model = await getNamespaceEmbeddingModel({ embeddingConfig }, "query");

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
