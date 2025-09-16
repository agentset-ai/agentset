import type { LanguageModel, ModelMessage } from "ai";
import { MyUIMessage } from "@/types/ai";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  generateText,
  streamText,
} from "ai";

import type { QueryVectorStoreOptions } from "@agentset/engine";

import type { AgenticSearchNamespace } from "./search";
import { NEW_MESSAGE_PROMPT } from "../prompts";
import { agenticSearch } from "./search";
import { formatSources } from "./utils";

type AgenticPipelineOptions = {
  model: LanguageModel;
  queryOptions?: Omit<QueryVectorStoreOptions, "query">;
  systemPrompt?: string;
  temperature?: number;
  messagesWithoutQuery: ModelMessage[];
  lastMessage: string;
  afterQueries?: (totalQueries: number) => void;
  maxEvals?: number;
  tokenBudget?: number;
};

const STATUS_PART_ID = "agentset_status";
const QUERIES_PART_ID = "agentset_queries";

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
  const messages: ModelMessage[] = [
    ...messagesWithoutQuery,
    { role: "user", content: lastMessage },
  ];

  const stream = createUIMessageStream<MyUIMessage>({
    execute: async ({ writer }) => {
      writer.write({
        type: "start",
        messageId: generateId(),
      });
      writer.write({
        type: "start-step",
      });

      writer.write({
        id: STATUS_PART_ID,
        type: "data-status",
        data: "generating-queries",
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
            writer.write({
              id: STATUS_PART_ID,
              type: "data-status",
              data: "searching",
            });

            writer.write({
              id: QUERIES_PART_ID,
              type: "data-queries",
              data: newQueries.map((q) => q.query),
            });
          },
        },
      );

      afterQueries?.(totalQueries);

      writer.write({
        id: STATUS_PART_ID,
        type: "data-status",
        data: "generating-answer",
      });

      // TODO: shrink chunks and only select relevant ones to pass to the LLM
      const dedupedData = Object.values(chunks);
      writer.write({
        id: "SOURCES",
        type: "data-agentset-sources",
        data: {
          results: dedupedData,
          ...(includeLogs && {
            logs: Object.values(queryToResult),
          }),
        },
      });

      const newMessages: ModelMessage[] = [
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
      });

      writer.merge(
        messageStream.toUIMessageStream({
          sendStart: false,
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
  const messages: ModelMessage[] = [
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
  const newMessages: ModelMessage[] = [
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
