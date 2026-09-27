import { z } from "zod/v4";

import { EU_RERANK_MODELS, isEuRegion } from "@agentset/utils";

import { DEFAULT_RERANKER, RERANKER_MODELS, RerankingModel } from "./constants";

const EU_RERANKERS: readonly RerankingModel[] = EU_RERANK_MODELS;

export const rerankerSchema = isEuRegion
  ? z.enum(EU_RERANKERS as [RerankingModel, ...RerankingModel[]], {
      error: `This reranking model isn't available in this region. Use one of: ${EU_RERANKERS.join(", ")}`,
    })
  : z.enum(
      Object.entries(RERANKER_MODELS).flatMap(([provider, models]) =>
        models.map((m) => `${provider}:${m.model}`),
      ) as unknown as [RerankingModel, ...RerankingModel[]],
    );

export const rerankerSchemaWithDefault = rerankerSchema
  .optional()
  .default(DEFAULT_RERANKER);

/** Whether the reranking model can be used in this deployment's region. */
export const isRerankingModelAvailable = (model: string) =>
  rerankerSchema.safeParse(model).success;

type _ParsedRerankerMap = {
  [T in keyof typeof RERANKER_MODELS]: {
    provider: T;
    model: (typeof RERANKER_MODELS)[T][number]["model"];
  };
};

export const parseRerankingModelName = (rerankingModelName: string) => {
  const [provider, model] = rerankingModelName.split(":");

  return {
    provider,
    model,
  } as _ParsedRerankerMap[keyof _ParsedRerankerMap];
};
