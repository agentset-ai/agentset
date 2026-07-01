import { agenticSearchPipeline } from "@/lib/agentic-search";
import type { SearchToolConfig } from "@/lib/agentic-search/tools";
import { agenticTools } from "@/lib/agentic-search/tools";
import { AgentsetApiError } from "@/lib/api/errors";
import { withAuthApiHandler } from "@/lib/api/handler";
import { parseRequestBody } from "@/lib/api/utils";
import { waitUntil } from "@vercel/functions";
import { convertToModelMessages } from "ai";

import { db } from "@agentset/db/client";
import {
  getAgenticLanguageModel,
  getNamespaceEmbeddingModel,
  getNamespaceVectorStore,
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

export const preferredRegion = "iad1"; // make this closer to the DB
export const maxDuration = 300; // agentic runs can take multiple tool-calling steps

export const POST = withAuthApiHandler(
  async ({ req, namespace, tenantId, headers }) => {
    const body = await chatSchema.parseAsync(await parseRequestBody(req));

    if (body.messages.length === 0) {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Messages must contain at least one message",
      });
    }

    const messages = convertToModelMessages(body.messages, {
      tools: agenticTools,
      ignoreIncompleteToolCalls: true,
      // re-inline the model's plan on follow-up turns; other data parts
      // (sources, status) are dropped from the model-visible history
      convertDataPart: (part) =>
        part.type === "data-planning" && typeof part.data === "string"
          ? { type: "text", text: `<planning>${part.data}</planning>` }
          : undefined,
    });

    const languageModel = getAgenticLanguageModel(body.llmModel);
    const [vectorStore, embeddingModel] = await Promise.all([
      getNamespaceVectorStore(namespace, tenantId),
      getNamespaceEmbeddingModel(namespace, "query"),
    ]);

    // accurate: rerank semantic searches (fetch topK, keep rerankLimit)
    // fast: skip reranking and fetch fewer chunks
    const rerankLimit = Math.min(body.rerankLimit, body.topK);
    const searchConfig: SearchToolConfig =
      body.mode === "fast"
        ? {
            topK: rerankLimit,
            keywordTopK: rerankLimit,
            rerank: false,
          }
        : {
            topK: body.topK,
            keywordTopK: rerankLimit,
            rerank: { model: body.rerankModel, limit: rerankLimit },
          };

    return agenticSearchPipeline({
      languageModel,
      systemPrompt: body.systemPrompt,
      messages,
      temperature: body.temperature,
      context: {
        vectorStore,
        embeddingModel,
        search: searchConfig,
      },
      abortSignal: req.signal,
      afterRun: (totalQueries) => {
        incrementUsage(namespace.id, Math.max(totalQueries, 1));
      },
      headers,
    });
  },
);
