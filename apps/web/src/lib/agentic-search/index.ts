import type { MyUIMessage } from "@/types/ai";
import type { ModelMessage } from "ai";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";

import type { AgenticLanguageModel } from "@agentset/engine";

import type { AgenticToolContext } from "./tools";
import { extractPlanningStreamTransform } from "./extract-planning";
import { agenticTools } from "./tools";

export type { AgenticToolContext, SearchToolConfig } from "./tools";
export { AGENTIC_SYSTEM_PROMPT } from "./prompts";

// stop after 20 steps
const MAX_STEPS = 20;

type AgenticSearchPipelineOptions = {
  languageModel: AgenticLanguageModel;
  systemPrompt: string;
  messages: ModelMessage[];
  context: AgenticToolContext;
  temperature?: number;
  headers?: HeadersInit;
  /** aborts the run when the client disconnects or hits stop */
  abortSignal?: AbortSignal;
  /** called with the total number of vector store queries when the run ends */
  afterRun?: (totalQueries: number) => void;
};

/**
 * Agentic search chat: the model drives retrieval through the `search` and
 * `expand` tools until it can answer, then streams a grounded response with
 * a `<planning>` block extracted into `data-planning` UI parts.
 */
export const agenticSearchPipeline = ({
  languageModel,
  systemPrompt,
  messages,
  context,
  temperature,
  headers,
  abortSignal,
  afterRun,
}: AgenticSearchPipelineOptions) => {
  let totalQueries = 0;
  const toolContext: AgenticToolContext = {
    ...context,
    onQuery: () => {
      totalQueries++;
    },
  };

  // meter usage exactly once, whether the run finishes or is aborted
  let ranAfterRun = false;
  const finishRun = () => {
    if (ranAfterRun) return;
    ranAfterRun = true;
    afterRun?.(totalQueries);
  };

  const stream = createUIMessageStream<MyUIMessage>({
    execute: ({ writer }) => {
      const result = streamText({
        model: languageModel.model,
        system: systemPrompt,
        messages,
        tools: agenticTools,
        // expand needs an ordered range fetch, which not all stores support
        activeTools: context.vectorStore.supportsOrderedQuery()
          ? undefined
          : ["search"],
        providerOptions: languageModel.providerOptions,
        // temperature is ignored (stripped by the SDK) for reasoning models
        temperature,
        stopWhen: stepCountIs(MAX_STEPS),
        maxOutputTokens: 5000,
        experimental_transform: smoothStream({ chunking: "word" }),
        experimental_context: toolContext,
        abortSignal,
        onAbort: finishRun,
        onFinish: finishRun,
        onError: (error) => {
          console.error(error);
        },
      });

      writer.merge(
        result.toUIMessageStream({
          sendReasoning: true,
          // don't leak raw provider/tool error messages to the client
          onError: (error) => {
            console.error(error);
            return "An error occurred";
          },
        }),
      );
    },
    onError(error) {
      console.error(error);
      return "An error occurred";
    },
  });

  return createUIMessageStreamResponse({
    stream: stream.pipeThrough(extractPlanningStreamTransform()),
    headers,
  });
};
