import type { ModelMessage } from "ai";
import { streamAgenticResponse } from "@/lib/agentic";
import { AgentsetApiError } from "@/lib/api/errors";
import { withAuthApiHandler } from "@/lib/api/handler";
import { parseRequestBody } from "@/lib/api/utils";
import { DeepResearchPipeline } from "@/lib/deep-research";
import {
  CONDENSE_SYSTEM_PROMPT,
  CONDENSE_USER_PROMPT,
  NEW_MESSAGE_PROMPT,
} from "@/lib/prompts";
import { extractTextFromParts } from "@/lib/string-utils";
import { MyUIMessage } from "@/types/ai";
import { waitUntil } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  streamText,
} from "ai";

import { db } from "@agentset/db/client";
import {
  getNamespaceEmbeddingModel,
  getNamespaceLanguageModel,
  getNamespaceVectorStore,
  KeywordStore,
  queryVectorStore,
} from "@agentset/engine";

import { chatSchema } from "./schema";

const incrementUsage = (namespaceId: string, queries: number) => {
  waitUntil(
    (async () => {
      // track usage
      await db.namespace.update({
        where: {
          id: namespaceId,
        },
        data: {
          totalPlaygroundUsage: { increment: 1 },
          organization: {
            update: {
              searchUsage: { increment: queries },
            },
          },
        },
      });
    })(),
  );
};

// export const runtime = "edge";
export const preferredRegion = "iad1"; // make this closer to the DB
export const maxDuration = 60;

export const POST = withAuthApiHandler(
  async ({ req, namespace, tenantId, headers }) => {
    const body = await chatSchema.parseAsync(await parseRequestBody(req));

    const messages = convertToModelMessages(body.messages);
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

    // TODO: pass namespace config
    const [languageModel, vectorStore, embeddingModel] = await Promise.all([
      getNamespaceLanguageModel(body.llmModel),
      getNamespaceVectorStore(namespace, tenantId),
      getNamespaceEmbeddingModel(namespace, "query"),
    ]);

    let query: string;
    if (messagesWithoutQuery.length === 0 || body.mode === "agentic") {
      query = lastMessage;
    } else {
      // limit messagesWithoutQuery to the last 10 messages
      const messagesToCondense = messagesWithoutQuery.slice(-10);

      // we need to condense the messages + last message into a single query
      query = (
        await generateText({
          model: languageModel,
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
    }

    if (body.mode === "deepResearch") {
      const pipeline = new DeepResearchPipeline({
        modelConfig: {
          json: languageModel,
          planning: languageModel,
          summary: languageModel,
          answer: languageModel,
        },
        queryOptions: {
          embeddingModel,
          vectorStore,
          topK: body.topK,
          minScore: body.minScore,
          filter: body.filter,
          includeMetadata: body.includeMetadata,
          includeRelationships: body.includeRelationships,
          rerank: body.rerank
            ? {
                model: body.rerankModel,
                limit: body.rerankLimit,
              }
            : false,
        },
        // maxQueries
      });

      const answer = await pipeline.runResearch(query);
      incrementUsage(namespace.id, 1);

      return answer.toUIMessageStreamResponse({ headers });
    }

    if (body.mode === "agentic") {
      const keywordStore = namespace.keywordEnabled
        ? new KeywordStore(namespace.id, tenantId)
        : undefined;

      const result = streamAgenticResponse({
        model: languageModel,
        keywordStore,
        embeddingModel,
        vectorStore,
        topK: body.topK,
        rerank: body.rerank
          ? {
              model: body.rerankModel,
              limit: body.rerankLimit,
            }
          : undefined,
        systemPrompt: body.systemPrompt,
        temperature: body.temperature,
        messages,
        afterQueries: (totalQueries) => {
          incrementUsage(namespace.id, totalQueries);
        },
      });

      return result.toUIMessageStreamResponse({ headers });
    }

    const data = await queryVectorStore({
      embeddingModel,
      vectorStore,
      query,
      topK: body.topK,
      minScore: body.minScore,
      filter: body.filter,
      includeMetadata: body.includeMetadata,
      includeRelationships: body.includeRelationships,
      rerank: body.rerank
        ? {
            model: body.rerankModel,
            limit: body.rerankLimit,
          }
        : false,
    });

    if (!data) {
      throw new AgentsetApiError({
        code: "internal_server_error",
        message: "Failed to parse chunks",
      });
    }

    const newMessages: ModelMessage[] = [
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

    incrementUsage(namespace.id, 1);

    // add the sources to the stream
    const stream = createUIMessageStream<MyUIMessage>({
      execute: ({ writer }) => {
        const messageStream = streamText({
          model: languageModel,
          system: body.systemPrompt,
          messages: newMessages,
          temperature: body.temperature,
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
  },
);
