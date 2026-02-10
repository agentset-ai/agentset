export const LLM_MODELS = {
  openai: [
    { model: "gpt-4.1", name: "GPT-4.1" },
    { model: "gpt-5.2", name: "GPT-5.2" },
    { model: "gpt-5.1", name: "GPT-5.1" },
    { model: "gpt-5", name: "GPT-5" },
    { model: "gpt-5-mini", name: "GPT-5 Mini" },
    { model: "gpt-5-nano", name: "GPT-5 Nano" },
  ],
  // anthropic: [
  //   { model: "claude-sonnet-4.5", name: "Claude Sonnet 4.5" },
  //   { model: "claude-haiku-4.5", name: "Claude Haiku 4.5" },
  // ],
} as const;

export const LLM_PROVIDERS: Record<keyof typeof LLM_MODELS, string> = {
  openai: "OpenAI",
  // anthropic: "Anthropic",
};

export const LLM_MODEL_TO_PROVIDER: Record<LLM, keyof typeof LLM_PROVIDERS> =
  Object.fromEntries(
    Object.entries(LLM_MODELS).flatMap(([provider, models]) =>
      models.map((m) => [`${provider}:${m.model}`, provider]),
    ),
  ) as Record<LLM, keyof typeof LLM_PROVIDERS>;

type _LLMMap = {
  [T in keyof typeof LLM_MODELS]: `${T}:${(typeof LLM_MODELS)[T][number]["model"]}`;
};

export type LLM = _LLMMap[keyof _LLMMap];

export const DEFAULT_LLM: LLM = "openai:gpt-4.1";
