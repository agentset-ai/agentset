import { createAzure } from "@ai-sdk/azure";
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
  "openai:gpt-5-mini": "gpt-5-mini",
  "openai:gpt-5-nano": "gpt-5-nano",
};

export const getNamespaceLanguageModel = (
  model: LLM = DEFAULT_LLM,
): LanguageModel => {
  const modelId = modelToId[model];
  return openaiAzure.languageModel(modelId);
};
