import type { SearchToolConfig } from "@/lib/agentic-search/tools";
import { agenticSearchPipeline } from "@/lib/agentic-search";
import { AGENTIC_SYSTEM_PROMPT } from "@/lib/agentic-search/prompts";
import { agenticTools } from "@/lib/agentic-search/tools";
import { AgentsetApiError, exceededLimitError } from "@/lib/api/errors";
import { withPublicApiHandler } from "@/lib/api/handler/public";
import { hostingAuth } from "@/lib/api/hosting-auth";
import { ratelimit } from "@/lib/api/rate-limit";
import { parseRequestBody } from "@/lib/api/utils";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/prompts";
import { waitUntil } from "@vercel/functions";
import { convertToModelMessages, pruneMessages } from "ai";

import { db } from "@agentset/db/client";
import {
  getNamespaceEmbeddingModel,
  getNamespaceLanguageModel,
  getNamespaceVectorStore,
} from "@agentset/engine";
import { INFINITY_NUMBER } from "@agentset/utils";

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
          organization: {
            select: {
              plan: true,
              searchUsage: true,
              searchLimit: true,
            },
          },
        },
      },
    },
  });
};

// hosting rows created before the agentic migration store the old single-shot
// RAG prompt verbatim; those should pick up the new agentic default
const LEGACY_DEFAULT_PROMPT = DEFAULT_SYSTEM_PROMPT.compile().trim();
const getSystemPrompt = (storedPrompt: string | null) => {
  if (!storedPrompt || storedPrompt.trim() === LEGACY_DEFAULT_PROMPT) {
    return AGENTIC_SYSTEM_PROMPT;
  }
  return storedPrompt;
};

export const preferredRegion = "iad1"; // make this closer to the DB
export const maxDuration = 300; // agentic runs can take multiple tool-calling steps

export const POST = withPublicApiHandler(
  async ({ req, searchParams, headers }) => {
    const body = await hostingChatSchema.parseAsync(
      await parseRequestBody(req),
    );

    if (body.messages.length === 0 || body.messages.length > 50) {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Messages must contain between 1 and 50 messages",
      });
    }

    const converted = convertToModelMessages(body.messages, {
      tools: agenticTools,
      ignoreIncompleteToolCalls: true,
    });
    // tool results and reasoning from previous turns don't inform future
    // answers (the model re-searches); prune them to keep the context small.
    // Continuation payloads (trailing assistant/tool messages) are left
    // untouched: their kept tool calls need the paired reasoning items for
    // the Responses API replay.
    const messages =
      converted.at(-1)?.role === "user"
        ? pruneMessages({
            messages: converted,
            reasoning: "before-last-message",
            toolCalls: "before-last-message",
          })
        : converted;

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

    // this is an anonymous surface: rate limit per visitor IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { success } = await ratelimit(30, "1 m").limit(
      `hosting-chat:${hosting.id}:${ip}`,
    );
    if (!success) {
      throw new AgentsetApiError({
        code: "rate_limit_exceeded",
        message: "Too many requests.",
      });
    }

    // block orgs that already exceeded their retrieval quota
    const organization = hosting.namespace.organization;
    if (
      INFINITY_NUMBER !== organization.searchLimit &&
      organization.searchUsage >= organization.searchLimit
    ) {
      throw new AgentsetApiError({
        code: "rate_limit_exceeded",
        message: exceededLimitError({
          plan: organization.plan,
          limit: organization.searchLimit,
          type: "retrievals",
        }),
      });
    }

    const languageModel = getNamespaceLanguageModel(hosting.llmConfig?.model);
    const [vectorStore, embeddingModel] = await Promise.all([
      getNamespaceVectorStore(hosting.namespace),
      getNamespaceEmbeddingModel(hosting.namespace, "query"),
    ]);

    const rerankLimit = Math.min(
      hosting.rerankConfig?.limit ?? 15,
      hosting.topK,
    );
    const searchConfig: SearchToolConfig = {
      topK: hosting.topK,
      keywordTopK: rerankLimit,
      rerank: { model: hosting.rerankConfig?.model, limit: rerankLimit },
    };

    return agenticSearchPipeline({
      languageModel,
      systemPrompt: getSystemPrompt(hosting.systemPrompt),
      messages,
      context: {
        vectorStore,
        embeddingModel,
        search: searchConfig,
      },
      abortSignal: req.signal,
      afterRun: (totalQueries) => {
        incrementUsage(hosting.namespace.id, Math.max(totalQueries, 1));
      },
      headers,
    });
  },
);
