import { embed, EmbeddingModel } from "ai";

import { CohereReranker } from "../rerank/cohere";
import { VectorStore, VectorStoreQueryOptions } from "./common/vector-store";

export type QueryVectorStoreOptions = Omit<VectorStoreQueryOptions, "mode"> & {
  query: string;
  embeddingModel: EmbeddingModel;
  vectorStore: VectorStore;
  rerank?: boolean | { limit: number };
};

export const queryVectorStore = async ({
  embeddingModel,
  vectorStore,
  ...options
}: QueryVectorStoreOptions) => {
  const embedding = await embed({
    model: embeddingModel,
    value: options.query,
  });

  // TODO: track usage
  const results = await vectorStore.query({
    mode: {
      type: "semantic",
      vector: embedding.embedding,
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
    const reranker = new CohereReranker();
    rerankedResults = await reranker.rerank(results, {
      limit:
        typeof options.rerank === "object"
          ? options.rerank.limit
          : options.topK,
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
