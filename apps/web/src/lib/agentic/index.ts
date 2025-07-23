import type { CoreMessage, JSONValue, LanguageModelV1 } from "ai";
import { createDataStreamResponse, generateText, streamText } from "ai";

import type { QueryVectorStoreOptions } from "@agentset/engine";

import type { AgenticSearchNamespace } from "./search";
import { NEW_MESSAGE_PROMPT } from "../prompts";
import { agenticSearch } from "./search";
import { formatSources } from "./utils";

type AgenticPipelineOptions = {
  model: LanguageModelV1;
  queryOptions?: Omit<QueryVectorStoreOptions, "query">;
  systemPrompt?: string;
  temperature?: number;
  messagesWithoutQuery: CoreMessage[];
  lastMessage: string;
  afterQueries?: (totalQueries: number) => void;
  maxEvals?: number;
  tokenBudget?: number;
};

const agenticPipeline = (
  namespace: AgenticSearchNamespace,
  {
    model,
    queryOptions,
    headers,
    systemPrompt,
    temperature,
    messagesWithoutQuery,
    lastMessage,
    afterQueries,
    maxEvals = 3,
    tokenBudget = 4096,
    includeLogs = true,
  }: AgenticPipelineOptions & {
    headers?: HeadersInit;
    afterQueries?: (totalQueries: number) => void;
    includeLogs?: boolean;
  },
) => {
  const messages: CoreMessage[] = [
    ...messagesWithoutQuery,
    { role: "user", content: lastMessage },
  ];

  return createDataStreamResponse({
    execute: async (dataStream) => {
      dataStream.writeMessageAnnotation({
        type: "status",
        value: "generating-queries",
      });

      // step 1. generate queries
      const { chunks, queryToResult, totalQueries } = await agenticSearch(
        namespace,
        {
          model,
          messages,
          queryOptions,
          maxEvals,
          tokenBudget,
          onQueries: (newQueries) => {
            dataStream.writeMessageAnnotation({
              type: "status",
              value: "searching",
              queries: newQueries,
            });
          },
        },
      );

      afterQueries?.(totalQueries);

      dataStream.writeMessageAnnotation({
        type: "status",
        value: "generating-answer",
      });

      // TODO: shrink chunks and only select relevant ones to pass to the LLM
      const dedupedData = Object.values(chunks);
      const newMessages: CoreMessage[] = [
        ...messagesWithoutQuery,
        {
          role: "user",
          content: NEW_MESSAGE_PROMPT.compile({
            chunks: formatSources(dedupedData),
            // put the original query in the message to help with context
            query: `<query>${lastMessage}</query>`,
          }),
        },
      ];

      const messageStream = streamText({
        model,
        system: systemPrompt,
        messages: newMessages,
        temperature,
        onError: (error) => {
          console.error(error);
        },
      });

      dataStream.writeMessageAnnotation({
        type: "agentset_sources",
        value: { results: dedupedData } as unknown as JSONValue,
        ...(includeLogs && {
          logs: Object.values(queryToResult) as unknown as JSONValue,
        }),
      });
      messageStream.mergeIntoDataStream(dataStream);
    },
    onError(error) {
      console.error(error);
      return "An error occurred";
    },

    headers,
  });
};

export const generateAgenticResponse = async (
  namespace: AgenticSearchNamespace,
  {
    model,
    queryOptions,
    systemPrompt,
    temperature,
    messagesWithoutQuery,
    lastMessage,
    afterQueries,
    maxEvals = 3,
    tokenBudget = 4096,
  }: AgenticPipelineOptions,
) => {
  const messages: CoreMessage[] = [
    ...messagesWithoutQuery,
    { role: "user", content: lastMessage },
  ];

  // step 1. generate queries
  const { chunks, totalQueries } = await agenticSearch(namespace, {
    model,
    messages,
    queryOptions,
    maxEvals,
    tokenBudget,
  });

  afterQueries?.(totalQueries);

  // TODO: shrink chunks and only select relevant ones to pass to the LLM
  const dedupedData = Object.values(chunks);
  const newMessages: CoreMessage[] = [
    ...messagesWithoutQuery,
    {
      role: "user",
      content: NEW_MESSAGE_PROMPT.compile({
        chunks: formatSources(dedupedData),
        // put the original query in the message to help with context
        query: `<query>${lastMessage}</query>`,
      }),
    },
  ];

  const answer = await generateText({
    model: model,
    system: systemPrompt,
    messages: newMessages,
    temperature: temperature,
  });

  return {
    answer: answer.text,
    sources: dedupedData,
  };
};

export default agenticPipeline;
