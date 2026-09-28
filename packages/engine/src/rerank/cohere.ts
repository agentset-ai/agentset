import { CohereClientV2 } from "cohere-ai";

import { VectorStoreResult } from "../vector-store/common/vector-store";
import { Reranker, RerankOptions } from "./common";

export class CohereReranker implements Reranker {
  private readonly client: CohereClientV2;
  private readonly model: string;

  constructor(
    model: string,
    { apiKey, baseUrl }: { apiKey: string; baseUrl?: string },
  ) {
    if (baseUrl) {
      // Azure AI Foundry endpoint: deployments are named `Cohere-<model>`,
      // e.g. `Cohere-rerank-v4.0-pro`
      this.client = new CohereClientV2({ token: apiKey, baseUrl });
      this.model = `Cohere-${model}`;
    } else {
      this.client = new CohereClientV2({ token: apiKey });
      this.model = model;
    }
  }

  async doRerank<T extends VectorStoreResult>(
    results: T[],
    options: RerankOptions,
  ): Promise<{ index: number; rerankScore?: number }[]> {
    const rerankResults = await this.client.rerank({
      documents: results.map((doc) => doc.text),
      query: options.query,
      topN: options.limit,
      model: this.model,
    });

    // TODO: track usage with rerankResults.meta
    return rerankResults.results.map((result) => ({
      index: result.index,
      rerankScore: result.relevanceScore,
    }));
  }
}
