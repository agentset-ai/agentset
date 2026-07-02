import type { queryVectorStoreSchema } from "@/schemas/api/query";
import type { z } from "zod/v4";
import { AgentsetApiError } from "@/lib/api/errors";

import type { Namespace } from "@agentset/db";
import type { QueryVectorStoreResult } from "@agentset/engine";
import {
  getNamespaceEmbeddingModel,
  getNamespaceVectorStore,
  queryVectorStore,
} from "@agentset/engine";

/**
 * Runs a public-API search over a namespace's vector store. Shared by the
 * REST search route and the MCP search tool so the option mapping (and the
 * Pinecone keyword-mode gate) lives in one place.
 */
export const searchNamespace = async ({
  namespace,
  tenantId,
  options,
}: {
  namespace: Pick<Namespace, "id" | "vectorStoreConfig" | "embeddingConfig">;
  tenantId?: string;
  options: z.infer<typeof queryVectorStoreSchema>;
}): Promise<QueryVectorStoreResult["results"]> => {
  const isPinecone =
    namespace.vectorStoreConfig?.provider === "MANAGED_PINECONE" ||
    namespace.vectorStoreConfig?.provider === "MANAGED_PINECONE_OLD" ||
    namespace.vectorStoreConfig?.provider === "PINECONE";

  if (options.mode === "keyword" && isPinecone) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: "Keyword search is not enabled for this namespace",
    });
  }

  const [embeddingModel, vectorStore] = await Promise.all([
    getNamespaceEmbeddingModel(namespace, "query"),
    getNamespaceVectorStore(namespace, tenantId),
  ]);

  const { results } = await queryVectorStore({
    embeddingModel,
    vectorStore,
    query: options.query,
    mode: options.mode,
    topK: options.topK,
    minScore: options.minScore,
    filter: options.filter,
    includeMetadata: options.includeMetadata,
    includeRelationships: options.includeRelationships,
    rerank: options.rerank
      ? {
          model: options.rerankModel,
          limit: options.rerankLimit,
        }
      : false,
  });

  return results;
};
