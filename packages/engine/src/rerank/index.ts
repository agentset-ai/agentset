import type { LogErrorContext } from "@agentset/utils";
import { isEuRegion, logError, REGION_FEATURES } from "@agentset/utils";
import { isAzureFoundryEndpoint } from "@agentset/utils/region-guard";
import {
  DEFAULT_RERANKER,
  isRerankingModelAvailable,
  parseRerankingModelName,
  RerankingModel,
} from "@agentset/validation";

import { env } from "../env";
import { ProviderUnavailableError } from "../errors";
import { VectorStoreResult } from "../vector-store/common/vector-store";
import { Reranker, RerankOptions } from "./common";

export const getRerankingModel = async (_model?: RerankingModel) => {
  const rerankingModel = _model ?? DEFAULT_RERANKER;
  if (isEuRegion && !isRerankingModelAvailable(rerankingModel)) {
    throw new ProviderUnavailableError(
      "This reranking model isn't available in this region",
    );
  }

  const { provider, model: modelName } =
    parseRerankingModelName(rerankingModel);

  switch (provider) {
    case "cohere": {
      // EU reranks through the Azure AI Foundry Cohere endpoint only
      if (isEuRegion && !isAzureFoundryEndpoint(env.DEFAULT_COHERE_BASE_URL)) {
        throw new ProviderUnavailableError(
          "Cohere reranking isn't available in this region",
        );
      }

      const { CohereReranker } = await import("./cohere");
      return new CohereReranker(modelName, {
        apiKey: env.DEFAULT_COHERE_API_KEY,
        baseUrl: env.DEFAULT_COHERE_BASE_URL,
      });
    }

    case "zeroentropy": {
      const apiKey = env.DEFAULT_ZEROENTROPY_API_KEY;
      if (!REGION_FEATURES.zeroEntropyRerank || !apiKey) {
        throw new ProviderUnavailableError(
          "ZeroEntropy reranking isn't available in this region",
        );
      }

      const { ZeroentropyReranker } = await import("./zeroentropy");
      return new ZeroentropyReranker(modelName, { apiKey });
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
    logContext,
    ...options
  }: RerankOptions & {
    model: Reranker;
    logContext?: LogErrorContext;
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
  } catch (error) {
    if (isEuRegion) {
      logError("Failed to rerank results", error, logContext);
    }

    // if re-ranking fails, return the original results
    return results;
  }
};
