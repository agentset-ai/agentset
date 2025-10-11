import { env } from "../env";
import { VectorStoreResult } from "../vector-store/common/vector-store";
import { Reranker, RerankOptions } from "./common";

export type RerankingModel = "cohere" | "zeroentropy";

export const getRerankingModel = async (model: RerankingModel) => {
  switch (model) {
    case "cohere": {
      const Cohere = await import("./cohere");
      return new Cohere.CohereReranker({ apiKey: env.DEFAULT_COHERE_API_KEY });
    }

    case "zeroentropy": {
      const Zeroentropy = await import("./zeroentropy");
      return new Zeroentropy.ZeroentropyReranker({
        apiKey: env.DEFAULT_ZEROENTROPY_API_KEY,
      });
    }

    default: {
      // This exhaustive check ensures TypeScript will error if a new provider
      // is added without handling it in the switch statement
      const _exhaustiveCheck: never = model;
      throw new Error(`Unknown vector store provider: ${_exhaustiveCheck}`);
    }
  }
};

export const rerank = async <T extends VectorStoreResult>(
  results: T[],
  {
    model,
    ...options
  }: RerankOptions & {
    model: Reranker;
  },
) => {
  try {
    const rerankedResults = await model.doRerank(results, options);
    return rerankedResults.map((result) => {
      const originalResult = results[result.index]!;
      return {
        ...originalResult,
        rerankScore: result.rerankScore,
      };
    });
  } catch {
    // if re-ranking fails, return the original results
    return results;
  }
};
