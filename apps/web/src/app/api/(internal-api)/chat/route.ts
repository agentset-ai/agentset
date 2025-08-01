import type { CoreMessage, JSONValue } from "ai";
import agenticPipeline from "@/lib/agentic";
import { AgentsetApiError } from "@/lib/api/errors";
import { withAuthApiHandler } from "@/lib/api/handler";
import { parseRequestBody } from "@/lib/api/utils";
import { DeepResearchPipeline } from "@/lib/deep-research";
import { getNamespaceLanguageModel } from "@/lib/llm";
import {
  CONDENSE_SYSTEM_PROMPT,
  CONDENSE_USER_PROMPT,
  NEW_MESSAGE_PROMPT,
} from "@/lib/prompts";
import { waitUntil } from "@vercel/functions";
import { createDataStreamResponse, generateText, streamText } from "ai";

import { db } from "@agentset/db";
import { queryVectorStore } from "@agentset/engine";

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

    const messagesWithoutQuery = body.messages.slice(0, -1);
    const lastMessage =
      body.messages.length > 0
        ? (body.messages[body.messages.length - 1]!.content as string)
        : null;

    if (!lastMessage) {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Messages must contain at least one message",
      });
    }

    // TODO: pass namespace config
    const languageModel = await getNamespaceLanguageModel();

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
      const pipeline = new DeepResearchPipeline(namespace, {
        modelConfig: {
          json: languageModel,
          planning: languageModel,
          summary: languageModel,
          answer: languageModel,
        },
        queryOptions: {
          tenantId,
          topK: body.topK,
          minScore: body.minScore,
          filter: body.filter,
          includeMetadata: body.includeMetadata,
          includeRelationships: body.includeRelationships,
          rerankLimit: body.rerankLimit,
          rerank: body.rerank,
        },
        // maxQueries
      });

      const answer = await pipeline.runResearch(query);
      incrementUsage(namespace.id, 1);

      return answer.toDataStreamResponse({ headers });
    }

    if (body.mode === "agentic") {
      const result = agenticPipeline(namespace, {
        model: languageModel,
        queryOptions: {
          tenantId,
          topK: body.topK,
          minScore: body.minScore,
          filter: body.filter,
          includeMetadata: body.includeMetadata,
          includeRelationships: body.includeRelationships,
          rerankLimit: body.rerankLimit,
          rerank: body.rerank,
        },
        systemPrompt: body.systemPrompt,
        temperature: body.temperature,
        messagesWithoutQuery,
        lastMessage,
        afterQueries: (totalQueries) => {
          incrementUsage(namespace.id, totalQueries);
        },
      });

      return result;
    }

    // TODO: track the usage
    const data = await queryVectorStore(namespace, {
      query,
      tenantId,
      topK: body.topK,
      minScore: body.minScore,
      filter: body.filter,
      includeMetadata: body.includeMetadata,
      includeRelationships: body.includeRelationships,
      rerankLimit: body.rerankLimit,
      rerank: body.rerank,
    });

    if (!data) {
      throw new AgentsetApiError({
        code: "internal_server_error",
        message: "Failed to parse chunks",
      });
    }

    const newMessages: CoreMessage[] = [
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
    return createDataStreamResponse({
      execute: (dataStream) => {
        const messageStream = streamText({
          model: languageModel,
          system: body.systemPrompt,
          messages: newMessages,
          temperature: body.temperature,
          onError: (error) => {
            console.error(error);
          },
        });

        dataStream.writeMessageAnnotation({
          type: "agentset_sources",
          value: data as unknown as JSONValue,
        });
        messageStream.mergeIntoDataStream(dataStream);
      },
      headers,
    });
  },
);
