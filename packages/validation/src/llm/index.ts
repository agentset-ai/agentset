import z from "zod/v4";

const llms = {
  openai: ["gpt-4.1", "gpt-5", "gpt-5-mini", "gpt-5-nano"],
} as const;

type _LLMMap = {
  [T in keyof typeof llms]: `${T}:${(typeof llms)[T][number]}`;
};

export type LLM = _LLMMap[keyof _LLMMap];

export const llmSchema = z.enum(
  Object.entries(llms).flatMap(([key, values]) =>
    values.map((value) => `${key}:${value}`),
  ) as unknown as LLM[],
);

type _ParsedLLMMap = {
  [T in keyof typeof llms]: {
    provider: T;
    model: (typeof llms)[T][number];
  };
};

export const parseLLMName = (llmName: string) => {
  const [provider, model] = llmName.split(":");

  return {
    provider,
    model,
  } as _ParsedLLMMap[keyof _ParsedLLMMap];
};
