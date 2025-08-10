import { CohereClientV2 } from "cohere-ai";
import { MetadataMode } from "llamaindex";

import { tryCatch } from "@agentset/utils";

import { env } from "../env";
import {
  BaseRerankDocument,
  BaseReranker,
  RerankOptions,
  RerankResult,
} from "./common";

export class CohereReranker extends BaseReranker {
  private readonly client: CohereClientV2;

  constructor({ apiKey }: { apiKey?: string } = {}) {
    super();
    this.client = new CohereClientV2({
      token: apiKey ?? env.DEFAULT_COHERE_API_KEY,
    });
  }

  async rerank<T extends BaseRerankDocument>(
    results: T[],
    options: RerankOptions,
  ) {
    if (!results.length) return results;

    const { data: rerankResults, error } = await tryCatch(
      this.client.rerank({
        documents: results.map((doc) => doc.node.getContent(MetadataMode.NONE)),
        query: options.query,
        topN: options.limit,
        model: "rerank-v3.5",
        returnDocuments: false,
      }),
    );

    if (error) {
      return results;
    }

    // TODO: track usage with rerankResults.meta
    return rerankResults.results
      .map((result) => {
        // Use the index from the result to find the original document
        const originalIndex = result.index;
        const originalDoc = results[originalIndex];

        if (!originalDoc) {
          return null;
        }

        return {
          ...originalDoc,
          rerankScore: result.relevanceScore,
        };
      })
      .filter(Boolean) as RerankResult<T>[];
  }
}
