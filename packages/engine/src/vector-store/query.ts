import { embed, EmbeddingModel } from "ai";

import { RerankingModel } from "@agentset/validation";

import { getRerankingModel, rerank } from "../rerank";
import { VectorStore, VectorStoreQueryOptions } from "./common/vector-store";

export type QueryVectorStoreOptions = Omit<VectorStoreQueryOptions, "mode"> & {
  query: string;
  embeddingModel: EmbeddingModel;
  vectorStore: VectorStore;
  rerank?: false | { model?: RerankingModel; limit?: number };
  mode?: VectorStoreQueryOptions["mode"]["type"];
};

export const queryVectorStore = async ({
  embeddingModel,
  vectorStore,
  mode = "semantic",
  ...options
}: QueryVectorStoreOptions) => {
  const embedding = await embed({
    model: embeddingModel,
    value: options.query,
  });

  // TODO: track usage
  const results = await vectorStore.query({
    mode: {
      type: mode,
      vector: embedding.embedding,
      text: options.query,
    },
    topK: options.topK,
    filter: options.filter,
    minScore: options.minScore,
    includeMetadata: options.includeMetadata,
    includeRelationships: options.includeRelationships,
  });

  // If re-ranking is enabled and we have a query, perform reranking
  let rerankedResults: typeof results | null = null;
  if (options.rerank && results.length > 0) {
    const reranker = await getRerankingModel(options.rerank.model);
    rerankedResults = await rerank(results, {
      model: reranker,
      limit: options.rerank.limit ?? options.topK,
      query: options.query,
    });
  }

  return {
    query: options.query,
    unorderedIds: rerankedResults ? results.map((result) => result.id) : null,
    results: rerankedResults || results,
  };
};

export type QueryVectorStoreResult = NonNullable<
  Awaited<ReturnType<typeof queryVectorStore>>
>;
