import type { chatOptionsSchema } from "@/schemas/api/chat";
import type { ModelMessage } from "ai";
import type { z } from "zod/v4";
import agenticPipeline, { generateAgenticResponse } from "@/lib/agentic";
import { AgentsetApiError } from "@/lib/api/errors";
import { DeepResearchPipeline } from "@/lib/deep-research";
import {
  CONDENSE_SYSTEM_PROMPT,
  CONDENSE_USER_PROMPT,
  NEW_MESSAGE_PROMPT,
} from "@/lib/prompts";
import { extractTextFromParts } from "@/lib/string-utils";
import type { MyUIMessage } from "@/types/ai";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  streamText,
} from "ai";

import type { Namespace } from "@agentset/db";
import type {
  NamespaceLanguageModel,
  QueryVectorStoreResult,
} from "@agentset/engine";
import {
  getNamespaceEmbeddingModel,
  getNamespaceLanguageModel,
  getNamespaceVectorStore,
  queryVectorStore,
} from "@agentset/engine";

export type ChatOptions = z.infer<typeof chatOptionsSchema>;

interface ChatPipelineParams {
  namespace: Pick<Namespace, "id" | "vectorStoreConfig" | "embeddingConfig">;
  tenantId?: string;
  messages: ModelMessage[];
  options: ChatOptions;
  onUsageIncrement?: (queries: number) => void;
}

const prepareChat = async ({
  namespace,
  tenantId,
  messages,
  options,
}: Pick<
  ChatPipelineParams,
  "namespace" | "tenantId" | "messages" | "options"
>) => {
  const messagesWithoutQuery = messages.slice(0, -1);
  const lastMessage =
    messages.length > 0
      ? extractTextFromParts(messages[messages.length - 1]!.content)
      : null;

  if (!lastMessage) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: "Messages must contain at least one message",
    });
  }

  if (messages[messages.length - 1]!.role !== "user") {
    throw new AgentsetApiError({
      code: "bad_request",
      message: "The last message must be from the user",
    });
  }

  // TODO: pass namespace config
  const languageModel = getNamespaceLanguageModel(options.llmModel);
  const [vectorStore, embeddingModel] = await Promise.all([
    getNamespaceVectorStore(namespace, tenantId),
    getNamespaceEmbeddingModel(namespace, "query"),
  ]);

  return {
    messagesWithoutQuery,
    lastMessage,
    languageModel,
    queryOptions: {
      embeddingModel,
      vectorStore,
      topK: options.topK,
      minScore: options.minScore,
      filter: options.filter,
      includeMetadata: options.includeMetadata,
      includeRelationships: options.includeRelationships,
      rerank: options.rerank
        ? {
            model: options.rerankModel,
            limit: options.rerankLimit,
          }
        : (false as const),
      consistency: "strong" as const,
    },
  };
};

const condenseQuery = async ({
  languageModel,
  messagesWithoutQuery,
  lastMessage,
}: {
  languageModel: NamespaceLanguageModel;
  messagesWithoutQuery: ModelMessage[];
  lastMessage: string;
}) => {
  if (messagesWithoutQuery.length === 0) return lastMessage;

  // limit messagesWithoutQuery to the last 10 messages
  const messagesToCondense = messagesWithoutQuery.slice(-10);

  // we need to condense the messages + last message into a single query
  return (
    await generateText({
      model: languageModel.model,
      providerOptions: languageModel.providerOptions,
      prompt: CONDENSE_SYSTEM_PROMPT.compile({
        question: lastMessage,
        chatHistory: CONDENSE_USER_PROMPT.compile({
          query: lastMessage,
          chatHistory: messagesToCondense
            .map(
              (m) =>
                `- ${m.role === "user" ? "Human" : "Assistant"}: ${m.content as string}`,
            )
            .join("\n\n"),
        }),
      }),
    })
  ).text;
};

const makeDeepResearchPipeline = ({
  languageModel,
  queryOptions,
}: {
  languageModel: NamespaceLanguageModel;
  queryOptions: Awaited<ReturnType<typeof prepareChat>>["queryOptions"];
}) =>
  new DeepResearchPipeline({
    modelConfig: {
      json: languageModel.model,
      planning: languageModel.model,
      summary: languageModel.model,
      answer: languageModel.model,
    },
    queryOptions,
    // maxQueries
  });

const makeRagMessages = ({
  messagesWithoutQuery,
  lastMessage,
  data,
}: {
  messagesWithoutQuery: ModelMessage[];
  lastMessage: string;
  data: QueryVectorStoreResult;
}): ModelMessage[] => [
  ...messagesWithoutQuery,
  {
    role: "user",
    content: NEW_MESSAGE_PROMPT.compile({
      chunks: data.results
        .map((chunk, idx) => `[${idx + 1}]: ${chunk.text}`)
        .join("\n\n"),
      query: lastMessage, // put the original query in the message to help with context
    }),
  },
];

export const streamChat = async ({
  namespace,
  tenantId,
  messages,
  options,
  headers,
  onUsageIncrement,
}: ChatPipelineParams & {
  headers?: Record<string, string>;
}): Promise<Response> => {
  const { messagesWithoutQuery, lastMessage, languageModel, queryOptions } =
    await prepareChat({ namespace, tenantId, messages, options });

  if (options.mode === "agentic") {
    return agenticPipeline({
      model: languageModel,
      queryOptions,
      systemPrompt: options.systemPrompt,
      temperature: options.temperature,
      messagesWithoutQuery,
      lastMessage,
      afterQueries: (totalQueries) => {
        onUsageIncrement?.(totalQueries);
      },
      headers,
    });
  }

  const query = await condenseQuery({
    languageModel,
    messagesWithoutQuery,
    lastMessage,
  });

  if (options.mode === "deepResearch") {
    const pipeline = makeDeepResearchPipeline({ languageModel, queryOptions });

    const answer = await pipeline.runResearch(query);
    onUsageIncrement?.(1);

    return answer.toUIMessageStreamResponse({ headers });
  }

  const data = await queryVectorStore({ ...queryOptions, query });

  const newMessages = makeRagMessages({
    messagesWithoutQuery,
    lastMessage,
    data,
  });

  onUsageIncrement?.(1);

  // add the sources to the stream
  const stream = createUIMessageStream<MyUIMessage>({
    execute: ({ writer }) => {
      const messageStream = streamText({
        model: languageModel.model,
        providerOptions: languageModel.providerOptions,
        system: options.systemPrompt,
        messages: newMessages,
        temperature: options.temperature,
        onError: (error) => {
          console.error(error);
        },
      });

      writer.write({
        type: "data-agentset-sources",
        data,
      });
      writer.merge(messageStream.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream, headers });
};

export const generateChat = async ({
  namespace,
  tenantId,
  messages,
  options,
  onUsageIncrement,
}: ChatPipelineParams): Promise<{
  text: string;
  sources?: QueryVectorStoreResult["results"];
}> => {
  const { messagesWithoutQuery, lastMessage, languageModel, queryOptions } =
    await prepareChat({ namespace, tenantId, messages, options });

  if (options.mode === "agentic") {
    const { answer, sources } = await generateAgenticResponse({
      model: languageModel,
      queryOptions,
      systemPrompt: options.systemPrompt,
      temperature: options.temperature,
      messagesWithoutQuery,
      lastMessage,
      afterQueries: (totalQueries) => {
        onUsageIncrement?.(totalQueries);
      },
    });

    return { text: answer, sources };
  }

  const query = await condenseQuery({
    languageModel,
    messagesWithoutQuery,
    lastMessage,
  });

  if (options.mode === "deepResearch") {
    const pipeline = makeDeepResearchPipeline({ languageModel, queryOptions });

    const answer = await pipeline.runResearch(query);
    onUsageIncrement?.(1);

    return { text: await answer.text };
  }

  const data = await queryVectorStore({ ...queryOptions, query });

  onUsageIncrement?.(1);

  const result = await generateText({
    model: languageModel.model,
    providerOptions: languageModel.providerOptions,
    system: options.systemPrompt,
    messages: makeRagMessages({ messagesWithoutQuery, lastMessage, data }),
    temperature: options.temperature,
  });

  return { text: result.text, sources: data.results };
};
