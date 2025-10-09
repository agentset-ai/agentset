import { CohereClientV2 } from "cohere-ai";

import { tryCatch } from "@agentset/utils";

import { env } from "../env";
import { VectorStoreResult } from "../vector-store/common/vector-store";
import { Reranker, RerankOptions, RerankResult } from "./common";

export class CohereReranker extends Reranker {
  private readonly client: CohereClientV2;

  constructor({ apiKey }: { apiKey?: string } = {}) {
    super();
    this.client = new CohereClientV2({
      token: apiKey ?? env.DEFAULT_COHERE_API_KEY,
    });
  }

  async rerank<T extends VectorStoreResult>(
    results: T[],
    options: RerankOptions,
  ): Promise<RerankResult<T>[]> {
    if (!results.length) return results as RerankResult<T>[];

    const { data: rerankResults, error } = await tryCatch(
      this.client.rerank({
        documents: results.map((doc) => doc.text),
        query: options.query,
        topN: options.limit,
        model: "rerank-v3.5",
      }),
    );

    // if re-ranking fails, return the original results
    if (error) return results as RerankResult<T>[];

    // TODO: track usage with rerankResults.meta
    return rerankResults.results
      .map((result) => {
        // Use the index from the result to find the original document
        const originalIndex = result.index;
        const originalDoc = results[originalIndex]!;

        return {
          ...originalDoc,
          rerankScore: result.relevanceScore,
        };
      })
      .filter(Boolean) as RerankResult<T>[];
  }
}
