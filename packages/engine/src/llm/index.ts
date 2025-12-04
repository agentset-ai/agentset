import { createAzure } from "@ai-sdk/azure";
import { LanguageModel } from "ai";

import { DEFAULT_LLM, LLM } from "@agentset/validation";

import { env } from "../env";

const azure = createAzure({
  apiKey: env.DEFAULT_AZURE_API_KEY,
  resourceName: env.DEFAULT_AZURE_RESOURCE_NAME,
  apiVersion: "preview",
});

const modelToId: Record<LLM, string> = {
  "openai:gpt-4.1": "gpt-4.1",
  "openai:gpt-5": "gpt-5",
  "openai:gpt-5.1": "gpt-5.1",
  "openai:gpt-5-mini": "gpt-5-mini",
  "openai:gpt-5-nano": "gpt-5-nano",
};

export const getNamespaceLanguageModel = (model?: LLM): LanguageModel => {
  return azure.languageModel(modelToId[model ?? DEFAULT_LLM]);
};
