import z from "zod/v4";

const rerankers = {
  cohere: ["rerank-v3.5", "rerank-english-v3.0", "rerank-multilingual-v3.0"],
  zeroentropy: ["zerank-1", "zerank-1-small"],
} as const;

type _RerankerMap = {
  [T in keyof typeof rerankers]: `${T}:${(typeof rerankers)[T][number]}`;
};

export type RerankingModel = _RerankerMap[keyof _RerankerMap];

export const rerankerSchema = z.enum(
  Object.entries(rerankers).flatMap(([key, values]) =>
    values.map((value) => `${key}:${value}`),
  ) as unknown as RerankingModel[],
);

type _ParsedRerankerMap = {
  [T in keyof typeof rerankers]: {
    provider: T;
    model: (typeof rerankers)[T][number];
  };
};

export const parseRerankingModelName = (rerankingModelName: string) => {
  const [provider, model] = rerankingModelName.split(":");

  return {
    provider,
    model,
  } as _ParsedRerankerMap[keyof _ParsedRerankerMap];
};
