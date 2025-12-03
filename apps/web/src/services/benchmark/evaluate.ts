/**
 * Benchmark evaluation service
 *
 * Framework-agnostic benchmark evaluation functionality.
 */

import type { ModelMessage } from "ai";
import {
  correctnessEval,
  faithfulnessEval,
  relevanceEval,
} from "@/app/api/(internal-api)/benchmark/utils";
import { generateAgenticResponse } from "@/lib/agentic";
import { AgentsetApiError } from "@/lib/api/errors";
import { NEW_MESSAGE_PROMPT } from "@/lib/prompts";
import { waitUntil } from "@vercel/functions";
import { generateText } from "ai";

import type { QueryVectorStoreResult, VectorFilter } from "@agentset/engine";
import {
  getNamespaceEmbeddingModel,
  getNamespaceLanguageModel,
  getNamespaceVectorStore,
  queryVectorStore,
} from "@agentset/engine";

import type { ProtectedAgentsetContext } from "../shared/context";
import { getNamespace } from "../shared/namespace-access";

export type BenchmarkInput = {
  namespaceId: string;
  message: string;
  mode?: "normal" | "agentic";
  systemPrompt?: string;
  temperature?: number;
  topK: number;
  minScore?: number;
  filter?: VectorFilter;
  includeMetadata?: boolean;
  includeRelationships?: boolean;
  rerank?: boolean;
  rerankLimit?: number;
};

export type BenchmarkResult = {
  correctness: {
    score: number;
    maxScore: number;
    feedback: string;
  };
  faithfulness: {
    faithful: boolean;
  };
  relevance: {
    relevant: boolean;
  };
  answer: string;
  sources: QueryVectorStoreResult["results"];
};

const incrementUsage = (
  db: ProtectedAgentsetContext["db"],
  namespaceId: string,
  queries: number,
) => {
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

/**
 * Evaluate benchmark for a query
 *
 * @throws {AgentsetApiError} If namespace not found or user doesn't have access
 */
export const evaluateBenchmark = async (
  context: ProtectedAgentsetContext,
  input: BenchmarkInput,
): Promise<BenchmarkResult> => {
  const namespace = await getNamespace(context, {
    id: input.namespaceId,
  });

  if (!input.message) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: "Message is required",
    });
  }

  // TODO: pass namespace config
  const [languageModel, vectorStore, embeddingModel] = await Promise.all([
    getNamespaceLanguageModel("openai:gpt-4.1"),
    getNamespaceVectorStore(namespace),
    getNamespaceEmbeddingModel(namespace, "query"),
  ]);

  let result: {
    answer: string;
    sources: QueryVectorStoreResult["results"];
  };

  if (input.mode === "agentic") {
    result = await generateAgenticResponse({
      model: languageModel,
      systemPrompt: input.systemPrompt,
      temperature: input.temperature,
      queryOptions: {
        embeddingModel,
        vectorStore,
        topK: input.topK,
        minScore: input.minScore,
        filter: input.filter,
        includeMetadata: input.includeMetadata,
        includeRelationships: input.includeRelationships,
        rerank: input.rerank
          ? { model: "cohere:rerank-v3.5", limit: input.rerankLimit ?? 15 }
          : false,
      },
      messagesWithoutQuery: [],
      lastMessage: input.message,
      afterQueries: (totalQueries) => {
        incrementUsage(context.db, namespace.id, totalQueries);
      },
    });
  } else {
    const data = await queryVectorStore({
      embeddingModel,
      vectorStore,
      query: input.message,
      topK: input.topK,
      minScore: input.minScore,
      filter: input.filter,
      includeMetadata: input.includeMetadata,
      includeRelationships: input.includeRelationships,
      rerank: input.rerank
        ? { model: "cohere:rerank-v3.5", limit: input.rerankLimit ?? 15 }
        : false,
    });

    const newMessages: ModelMessage[] = [
      {
        role: "user",
        content: NEW_MESSAGE_PROMPT.compile({
          chunks: data.results
            .map((chunk, idx) => `[${idx + 1}]: ${chunk.text}`)
            .join("\n\n"),
          query: input.message, // put the original query in the message to help with context
        }),
      },
    ];

    incrementUsage(context.db, namespace.id, 1);

    const answer = await generateText({
      model: languageModel,
      system: input.systemPrompt,
      messages: newMessages,
      temperature: input.temperature,
    });

    result = {
      answer: answer.text,
      sources: data.results,
    };
  }

  const [correctness, faithfulness, relevance] = await Promise.all([
    correctnessEval(languageModel, {
      query: input.message,
      generatedAnswer: result.answer,
    }),
    faithfulnessEval(languageModel, {
      query: input.message,
      sources: result.sources,
    }),
    relevanceEval(languageModel, {
      query: input.message,
      generatedAnswer: result.answer,
      sources: result.sources,
    }),
  ]);

  return {
    correctness,
    faithfulness,
    relevance,
    ...result,
  };
};
