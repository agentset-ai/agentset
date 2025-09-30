import type { BaseNode, Metadata } from "@llamaindex/core/schema";
import { MetadataMode } from "@llamaindex/core/schema";
import { metadataDictToNode } from "@llamaindex/core/vector-store";
import { embed } from "ai";

import type { Namespace } from "@agentset/db";
import { filterFalsy } from "@agentset/utils";

import {
  getEmbeddingProviderOptions,
  getNamespaceEmbeddingModel,
} from "../embedding";
import { CohereReranker } from "../rerank/cohere";
import { getNamespaceVectorStore } from "./index";

type Result = {
  id: string;
  node: BaseNode<Metadata>;
  score?: number;
  rerankScore?: number;
};

export const formatResults = (
  results: Result[],
  {
    includeMetadata,
    includeRelationships,
  }: { includeMetadata?: boolean; includeRelationships?: boolean },
) => {
  return results.map((result) => {
    return {
      id: result.id,
      text: result.node.getContent(MetadataMode.NONE),
      metadata: includeMetadata ? result.node.metadata : undefined,
      relationships: includeRelationships
        ? result.node.relationships
        : undefined,
      score: result.score,
      rerankScore: result.rerankScore,
    };
  });
};

export type QueryVectorStoreOptions = {
  query: string;
  topK: number;
  tenantId?: string;
  minScore?: number;
  filter?: Record<string, string>;
  includeMetadata?: boolean;
  includeRelationships?: boolean;
  rerankLimit?: number;
  rerank?: boolean;
};

export const queryVectorStore = async (
  namespace: Pick<
    Namespace,
    "id" | "vectorStoreConfig" | "embeddingConfig" | "createdAt"
  >,
  options: QueryVectorStoreOptions,
) => {
  // TODO: if the embedding model is managed, track the usage
  const [embeddingModel, vectorStore] = await Promise.all([
    getNamespaceEmbeddingModel(namespace),
    getNamespaceVectorStore(namespace, options.tenantId),
  ]);

  const embedding = await embed({
    model: embeddingModel,
    value: options.query,
    ...getEmbeddingProviderOptions(namespace, "query"),
  });

  // TODO: track usage
  let { matches } = await vectorStore.query({
    vector: embedding.embedding,
    topK: options.topK,
    filter: options.filter,
    includeMetadata: true,
  });

  if (options.minScore !== undefined) {
    matches = matches.filter(
      (match) => match.score && match.score >= options.minScore!,
    );
  }

  const parsedResults = filterFalsy(
    matches.map((match) => {
      const nodeContent = match.metadata?._node_content;
      if (!nodeContent) return null;

      try {
        return {
          id: match.id,
          score: match.score,
          node: metadataDictToNode(match.metadata!),
        };
      } catch (e) {
        console.error(e);
        return null;
      }
    }),
  );

  if (matches.length > 0 && parsedResults.length === 0) {
    return null;
  }

  // If re-ranking is enabled and we have a query, perform reranking
  let rerankedResults: typeof parsedResults | null = null;
  if (options.rerank) {
    const reranker = new CohereReranker();
    rerankedResults = await reranker.rerank(parsedResults, {
      limit: options.rerankLimit || options.topK,
      query: options.query,
    });
  }

  return {
    query: options.query,
    unorderedIds: rerankedResults
      ? parsedResults.map((result) => result.id)
      : null,
    results: formatResults(rerankedResults ?? parsedResults, {
      includeMetadata: options.includeMetadata,
      includeRelationships: options.includeRelationships,
    }),
  };
};

export type QueryVectorStoreResult = NonNullable<
  Awaited<ReturnType<typeof queryVectorStore>>
>;
