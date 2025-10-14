import z from "zod/v4";

import { DEFAULT_RERANKER, RERANKER_MODELS, RerankingModel } from "./constants";

export const rerankerSchema = z.enum(
  Object.entries(RERANKER_MODELS).flatMap(([provider, models]) =>
    models.map((m) => `${provider}:${m.model}`),
  ) as unknown as [RerankingModel, ...RerankingModel[]],
);

export const rerankerSchemaWithDefault = rerankerSchema
  .optional()
  .default(DEFAULT_RERANKER);

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
