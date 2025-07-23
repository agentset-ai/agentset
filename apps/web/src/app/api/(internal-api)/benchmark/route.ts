import type { CoreMessage } from "ai";
import { generateAgenticResponse } from "@/lib/agentic";
import { AgentsetApiError } from "@/lib/api/errors";
import { withAuthApiHandler } from "@/lib/api/handler";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { parseRequestBody } from "@/lib/api/utils";
import { getNamespaceLanguageModel } from "@/lib/llm";
import { NEW_MESSAGE_PROMPT } from "@/lib/prompts";
import { waitUntil } from "@vercel/functions";
import { generateText } from "ai";

import type { QueryVectorStoreResult } from "@agentset/engine";
import { db } from "@agentset/db";
import { queryVectorStore } from "@agentset/engine";

import { chatSchema } from "./schema";
import { correctnessEval, faithfulnessEval, relevanceEval } from "./utils";

const incrementUsage = (namespaceId: string, queries: number) => {
  waitUntil(
    (async () => {
      // track usage
      await db.namespace.update({
        where: {
          id: namespaceId,
        },
        data: {
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

    const message = body.message;
    if (!message) {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Message is required",
      });
    }

    // TODO: pass namespace config
    const languageModel = await getNamespaceLanguageModel();

    let result: {
      answer: string;
      sources: QueryVectorStoreResult["results"];
    };

    if (body.mode === "agentic") {
      result = await generateAgenticResponse(namespace, {
        model: languageModel,
        systemPrompt: body.systemPrompt,
        temperature: body.temperature,
        messagesWithoutQuery: [],
        lastMessage: message,
        afterQueries: (totalQueries) => {
          incrementUsage(namespace.id, totalQueries);
        },
      });
    } else {
      const data = await queryVectorStore(namespace, {
        query: message,
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
        {
          role: "user",
          content: NEW_MESSAGE_PROMPT.compile({
            chunks: data.results
              .map((chunk, idx) => `[${idx + 1}]: ${chunk.text}`)
              .join("\n\n"),
            query: message, // put the original query in the message to help with context
          }),
        },
      ];

      incrementUsage(namespace.id, 1);

      const answer = await generateText({
        model: languageModel,
        system: body.systemPrompt,
        messages: newMessages,
        temperature: body.temperature,
      });

      result = {
        answer: answer.text,
        sources: data.results,
      };
    }

    const [correctness, faithfulness, relevance] = await Promise.all([
      correctnessEval(languageModel, {
        query: message,
        generatedAnswer: result.answer,
      }),
      faithfulnessEval(languageModel, {
        query: message,
        sources: result.sources,
      }),
      relevanceEval(languageModel, {
        query: message,
        generatedAnswer: result.answer,
        sources: result.sources,
      }),
    ]);

    return makeApiSuccessResponse({
      data: {
        correctness,
        faithfulness,
        relevance,
        ...result,
      },
      headers,
    });
  },
);
