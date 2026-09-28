import { z } from "zod/v4";

import { EU_LLM_MODELS, isEuRegion } from "@agentset/utils";

import { DEFAULT_LLM, LLM, LLM_MODELS } from "./constants";

const EU_LLMS: readonly LLM[] = EU_LLM_MODELS;

export const llmSchema = isEuRegion
  ? z.enum(EU_LLMS as [LLM, ...LLM[]], {
      error: `This model isn't available in this region. Use one of: ${EU_LLMS.join(", ")}`,
    })
  : z.enum(
      Object.entries(LLM_MODELS).flatMap(([provider, models]) =>
        models.map((m) => `${provider}:${m.model}`),
      ) as unknown as [LLM, ...LLM[]],
    );

export const llmSchemaWithDefault = llmSchema.optional().default(DEFAULT_LLM);

/** Whether the model can be used in this deployment's region. */
export const isLLMAvailable = (model: string) =>
  llmSchema.safeParse(model).success;

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
