export const LLM_MODELS = {
  openai: [
    { model: "gpt-4.1", name: "GPT-4.1" },
    { model: "gpt-5", name: "GPT-5" },
    { model: "gpt-5-mini", name: "GPT-5 Mini" },
    { model: "gpt-5-nano", name: "GPT-5 Nano" },
  ],
} as const;

export const LLM_PROVIDERS: Record<keyof typeof LLM_MODELS, string> = {
  openai: "OpenAI",
};

type _LLMMap = {
  [T in keyof typeof LLM_MODELS]: `${T}:${(typeof LLM_MODELS)[T][number]["model"]}`;
};

export type LLM = _LLMMap[keyof _LLMMap];

export const DEFAULT_LLM: LLM = "openai:gpt-4.1";
