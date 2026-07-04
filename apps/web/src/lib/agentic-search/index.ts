import type { MyUIMessage } from "@/types/ai";
import type { ModelMessage } from "ai";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";

import type { NamespaceLanguageModel } from "@agentset/engine";

import type { AgenticToolContext } from "./tools";
import { resolveSystemPrompt } from "./prompts";
import { agenticTools } from "./tools";

export type { AgenticToolContext, SearchToolConfig } from "./tools";
export {
  AGENTIC_SYSTEM_PROMPT,
  isKnownDefaultPrompt,
  resolveSystemPrompt,
} from "./prompts";

// stop after 20 steps
const MAX_STEPS = 20;

type AgenticSearchPipelineOptions = {
  languageModel: NamespaceLanguageModel;
  /**
   * Raw stored/user-supplied prompt; resolved via resolveSystemPrompt (pass
   * the stored value as-is, don't pre-default it). Default-shaped prompts run
   * the tuned agentic prompt; custom prompts get the platform tool and
   * citation contract appended.
   */
  systemPrompt?: string | null;
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
 * `expand` tools until it can answer, then streams a grounded response.
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
        system: resolveSystemPrompt(systemPrompt),
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

  return createUIMessageStreamResponse({ stream, headers });
};
