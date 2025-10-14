import {
  DEFAULT_RERANKER,
  parseRerankingModelName,
  RerankingModel,
} from "@agentset/validation";

import { env } from "../env";
import { VectorStoreResult } from "../vector-store/common/vector-store";
import { Reranker, RerankOptions } from "./common";

export const getRerankingModel = async (_model?: RerankingModel) => {
  const { provider, model: modelName } = parseRerankingModelName(
    _model ?? DEFAULT_RERANKER,
  );

  switch (provider) {
    case "cohere": {
      const { CohereReranker } = await import("./cohere");
      return new CohereReranker(modelName, {
        apiKey: env.DEFAULT_COHERE_API_KEY,
      });
    }

    case "zeroentropy": {
      const { ZeroentropyReranker } = await import("./zeroentropy");
      return new ZeroentropyReranker(modelName, {
        apiKey: env.DEFAULT_ZEROENTROPY_API_KEY,
      });
    }

    default: {
      // This exhaustive check ensures TypeScript will error if a new provider
      // is added without handling it in the switch statement
      const _exhaustiveCheck: never = provider;
      throw new Error(`Unknown reranking provider: ${_exhaustiveCheck}`);
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
