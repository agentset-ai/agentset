import { createAzure } from "@ai-sdk/azure";
import { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { LanguageModel } from "ai";

import { isEuRegion } from "@agentset/utils";
import { DEFAULT_LLM, isLLMAvailable, LLM } from "@agentset/validation";

import { env } from "../env";
import { ProviderUnavailableError } from "../errors";

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

// On EU no model stores responses (`store: false`), so every model that
// reasons round-trips its encrypted reasoning.
const EU_REASONING_MODELS = new Set<LLM>([
  "openai:gpt-5.5",
  "openai:gpt-5-mini",
  "openai:gpt-5-nano",
]);

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
  if (isEuRegion && !isLLMAvailable(model)) {
    throw new ProviderUnavailableError(
      "This model isn't available in this region",
    );
  }

  const modelId = modelToId[model];

  if (isEuRegion) {
    return {
      model: openaiAzure.responses(modelId),
      providerOptions: {
        openai: EU_REASONING_MODELS.has(model)
          ? { store: false, include: ["reasoning.encrypted_content"] }
          : { store: false },
      } satisfies { openai: OpenAIResponsesProviderOptions },
    };
  }

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
