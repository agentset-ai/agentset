import agenticPipeline from "@/lib/agentic";
import { AgentsetApiError } from "@/lib/api/errors";
import { withPublicApiHandler } from "@/lib/api/handler/public";
import { hostingAuth } from "@/lib/api/hosting-auth";
import { parseRequestBody } from "@/lib/api/utils";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/prompts";
import { extractTextFromParts } from "@/lib/string-utils";
import { waitUntil } from "@vercel/functions";
import { convertToModelMessages } from "ai";

import { db } from "@agentset/db";
import {
  getNamespaceEmbeddingModel,
  getNamespaceLanguageModel,
  getNamespaceVectorStore,
  KeywordStore,
} from "@agentset/engine";

import { hostingChatSchema } from "./schema";

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

const getHosting = async (namespaceId: string) => {
  return db.hosting.findFirst({
    where: {
      namespaceId,
    },
    select: {
      id: true,
      systemPrompt: true,
      rerankConfig: true,
      llmConfig: true,
      topK: true,
      protected: true,
      allowedEmails: true,
      allowedEmailDomains: true,
      namespace: {
        select: {
          id: true,
          vectorStoreConfig: true,
          embeddingConfig: true,
          keywordEnabled: true,
        },
      },
    },
  });
};

// export const runtime = "edge";
export const preferredRegion = "iad1"; // make this closer to the DB
export const maxDuration = 60;

export const POST = withPublicApiHandler(
  async ({ req, searchParams, headers }) => {
    const body = await hostingChatSchema.parseAsync(
      await parseRequestBody(req),
    );

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

    const namespaceId = searchParams.namespaceId;
    if (!namespaceId) {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Namespace ID is required",
      });
    }

    const hosting = await getHosting(namespaceId);
    if (!hosting) {
      throw new AgentsetApiError({
        code: "not_found",
        message: "Hosting not found",
      });
    }

    await hostingAuth(req, hosting);

    const [languageModel, vectorStore, embeddingModel] = await Promise.all([
      getNamespaceLanguageModel(hosting.llmConfig?.model),
      getNamespaceVectorStore(hosting.namespace),
      getNamespaceEmbeddingModel(hosting.namespace, "query"),
    ]);

    const keywordStore = hosting.namespace.keywordEnabled
      ? new KeywordStore(hosting.namespace.id)
      : undefined;

    const result = agenticPipeline({
      model: languageModel,
      keywordStore,
      queryOptions: {
        embeddingModel,
        vectorStore,
        topK: hosting.topK,
        rerank: {
          model: hosting.rerankConfig?.model,
          limit: hosting.rerankConfig?.limit ?? 15,
        },
        includeMetadata: true,
      },
      systemPrompt: hosting.systemPrompt ?? DEFAULT_SYSTEM_PROMPT.compile(),
      temperature: 0,
      messagesWithoutQuery,
      lastMessage,
      afterQueries: (totalQueries) => {
        incrementUsage(hosting.namespace.id, totalQueries);
      },
      headers,
    });

    return result;
  },
);
