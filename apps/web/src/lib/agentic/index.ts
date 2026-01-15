import type { LanguageModel, ModelMessage } from "ai";
import { generateText, stepCountIs, streamText } from "ai";

import { getAgenticTools, GetAgenticToolsOptions } from "./tools";

type AgenticPipelineOptions = GetAgenticToolsOptions & {
  model: LanguageModel;
  systemPrompt?: string;
  temperature?: number;
  messages: ModelMessage[];
  afterQueries?: (totalQueries: number) => void;
};

export const streamAgenticResponse = ({
  model,
  embeddingModel,
  vectorStore,
  topK,
  rerank,
  keywordStore,
  systemPrompt,
  temperature,
  messages,
  afterQueries,
}: AgenticPipelineOptions) => {
  const tools = getAgenticTools({
    embeddingModel,
    vectorStore,
    topK,
    rerank,
    keywordStore,
  });

  let totalQueries = 0;
  return streamText({
    model,
    messages,
    system: systemPrompt,
    tools: tools,
    stopWhen: stepCountIs(20),
    temperature,
    onStepFinish: (step) => {
      totalQueries += step.toolResults.length;
    },
    onFinish: () => {
      afterQueries?.(totalQueries);
    },
  });
};

export const generateAgenticResponse = async ({
  model,
  embeddingModel,
  vectorStore,
  topK,
  rerank,
  keywordStore,
  systemPrompt,
  temperature,
  messages,
  afterQueries,
}: AgenticPipelineOptions) => {
  const tools = getAgenticTools({
    embeddingModel,
    vectorStore,
    topK,
    rerank,
    keywordStore,
  });

  const response = await generateText({
    model,
    messages,
    system: systemPrompt,
    tools: tools,
    stopWhen: stepCountIs(20),
    temperature,
  });

  const searchResults =
    response.steps.flatMap((step) =>
      step.toolResults
        .filter(
          (p) =>
            p?.toolName === "semantic_search" ||
            p?.toolName === "keyword_search",
        )
        .flatMap((p) => p?.output),
    ) ?? [];

  const totalToolCalls =
    response.steps?.reduce((acc, step) => acc + step.toolResults.length, 0) ??
    0;
  afterQueries?.(totalToolCalls);

  return {
    text: response.text,
    searchResults,
  };
};
