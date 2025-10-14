import { CohereClientV2 } from "cohere-ai";

import { VectorStoreResult } from "../vector-store/common/vector-store";
import { Reranker, RerankOptions } from "./common";

export class CohereReranker implements Reranker {
  private readonly client: CohereClientV2;

  constructor(
    private readonly model: string,
    { apiKey }: { apiKey: string },
  ) {
    this.client = new CohereClientV2({ token: apiKey });
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
