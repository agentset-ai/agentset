/**
 * Search service
 *
 * Framework-agnostic search functionality.
 */

import type { VectorFilter } from "node_modules/@agentset/engine/src/vector-store/common/filter";
import { AgentsetApiError } from "@/lib/api/errors";
import { incrementSearchUsage } from "@/lib/api/usage";

import type { QueryVectorStoreResult } from "@agentset/engine";
import type { RerankingModel } from "@agentset/validation";
import {
  getNamespaceEmbeddingModel,
  getNamespaceVectorStore,
  queryVectorStore,
} from "@agentset/engine";

import type { ProtectedAgentsetContext } from "../shared/context";
import { getNamespace } from "../shared/namespace-access";

export type SearchInput = {
  namespaceId: string;
  query: string;
  topK: number;
  rerank: boolean;
  rerankModel: RerankingModel;
  rerankLimit: number;
  filter?: VectorFilter;
};

export type SearchResult = QueryVectorStoreResult["results"][number];

/**
 * Perform vector search in a namespace
 *
 * @throws {AgentsetApiError} If namespace not found or user doesn't have access
 */
export const search = async (
  context: ProtectedAgentsetContext,
  input: SearchInput,
): Promise<SearchResult[]> => {
  const namespace = await getNamespace(context, {
    id: input.namespaceId,
  });

  const [embeddingModel, vectorStore] = await Promise.all([
    getNamespaceEmbeddingModel(namespace, "query"),
    getNamespaceVectorStore(namespace),
  ]);

  const queryResult = await queryVectorStore({
    query: input.query,
    topK: input.topK,
    filter: input.filter,
    includeMetadata: true,
    rerank: input.rerank
      ? { model: input.rerankModel, limit: input.rerankLimit }
      : false,
    embeddingModel,
    vectorStore,
  });

  // Track search usage
  incrementSearchUsage(namespace.id, 1);

  return queryResult.results;
};
