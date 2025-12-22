import type { LanguageModel, ModelMessage } from "ai";
import { stepCountIs, streamText } from "ai";

import { getAgenticTools, GetAgenticToolsOptions } from "./tools";

type AgenticPipelineOptions = GetAgenticToolsOptions & {
  model: LanguageModel;
  systemPrompt?: string;
  temperature?: number;
  messages: ModelMessage[];
  afterQueries?: (totalQueries: number) => void;
  headers?: HeadersInit;
};

export const generateAgenticResponse = ({
  model,
  embeddingModel,
  vectorStore,
  topK,
  rerank,
  keywordStore,
  headers,
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
  const result = streamText({
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

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    headers,
  });
};
