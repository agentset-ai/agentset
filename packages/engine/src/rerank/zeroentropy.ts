import { ZeroEntropy } from "zeroentropy";

import { VectorStoreResult } from "../vector-store/common/vector-store";
import { Reranker, RerankOptions } from "./common";

export class ZeroentropyReranker implements Reranker {
  private readonly client: ZeroEntropy;

  constructor(
    private readonly model: string,
    { apiKey }: { apiKey: string },
  ) {
    this.client = new ZeroEntropy({ apiKey });
  }

  async doRerank<T extends VectorStoreResult>(
    results: T[],
    options: RerankOptions,
  ): Promise<{ index: number; rerankScore?: number }[]> {
    const rerankResults = await this.client.models.rerank({
      model: this.model,
      documents: results.map((doc) => doc.text),
      query: options.query,
      top_n: options.limit,
    });

    // TODO: track usage
    return rerankResults.results.map((result) => ({
      index: result.index,
      rerankScore: result.relevance_score,
    }));
  }
}
