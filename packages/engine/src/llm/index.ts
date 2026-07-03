import { createAzure } from "@ai-sdk/azure";
import { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { LanguageModel } from "ai";

import { DEFAULT_LLM, LLM } from "@agentset/validation";

import { env } from "../env";

const openaiAzure = createAzure({
  apiKey: env.DEFAULT_AZURE_API_KEY,
  resourceName: env.DEFAULT_AZURE_RESOURCE_NAME,
});

// this maps the model names to the actual model IDs in azure
const modelToId: Record<LLM, string> = {
  "openai:gpt-4.1": "gpt-4.1",
  "openai:gpt-5": "gpt-5-chat",
  "openai:gpt-5.1": "gpt-5.1-chat",
  "openai:gpt-5.2": "gpt-5.2-chat",
  "openai:gpt-5.5": "gpt-5.5",
  "openai:gpt-5-mini": "gpt-5-mini",
  "openai:gpt-5-nano": "gpt-5-nano",
};

// models that expose reasoning through the Azure Responses API. For those we
// round-trip encrypted reasoning between the steps of an agentic loop.
const REASONING_MODELS = new Set<LLM>(["openai:gpt-5.5"]);

export type NamespaceLanguageModel = {
  model: LanguageModel;
  providerOptions?: { openai: OpenAIResponsesProviderOptions };
};

/**
 * All models go through the Azure Responses API — the chat-completions path
 * breaks on some chat deployments (e.g. `gpt-5-chat` rejects `max_tokens`).
 * For reasoning models we additionally request encrypted reasoning with
 * `store: false`, so the reasoning content can be replayed on follow-up steps
 * of an agentic loop.
 */
export const getNamespaceLanguageModel = (
  model: LLM = DEFAULT_LLM,
): NamespaceLanguageModel => {
  const modelId = modelToId[model];

  return {
    model: openaiAzure.responses(modelId),
    ...(REASONING_MODELS.has(model) && {
      providerOptions: {
        openai: {
          store: false,
          include: ["reasoning.encrypted_content"],
        } satisfies OpenAIResponsesProviderOptions,
      },
    }),
  };
};
