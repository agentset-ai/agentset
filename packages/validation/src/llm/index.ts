import z from "zod/v4";

import { DEFAULT_LLM, LLM, LLM_MODELS } from "./constants";

export const llmSchema = z.enum(
  Object.entries(LLM_MODELS).flatMap(([provider, models]) =>
    models.map((m) => `${provider}:${m.model}`),
  ) as unknown as [LLM, ...LLM[]],
);

export const llmSchemaWithDefault = llmSchema.optional().default(DEFAULT_LLM);

type _ParsedLLMMap = {
  [T in keyof typeof LLM_MODELS]: {
    provider: T;
    model: (typeof LLM_MODELS)[T][number]["model"];
  };
};

export const parseLLMName = (llmName: string) => {
  const [provider, model] = llmName.split(":");

  return {
    provider,
    model,
  } as _ParsedLLMMap[keyof _ParsedLLMMap];
};
