import type { SearchToolConfig } from "@/lib/agentic-search/tools";
import { agenticSearchPipeline } from "@/lib/agentic-search";
import { AGENTIC_SYSTEM_PROMPT } from "@/lib/agentic-search/prompts";
import { agenticTools } from "@/lib/agentic-search/tools";
import { AgentsetApiError } from "@/lib/api/errors";
import { withPublicApiHandler } from "@/lib/api/handler/public";
import { hostingAuth } from "@/lib/api/hosting-auth";
import { parseRequestBody } from "@/lib/api/utils";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/prompts";
import { waitUntil } from "@vercel/functions";
import { convertToModelMessages } from "ai";

import { db } from "@agentset/db/client";
import {
  getAgenticLanguageModel,
  getNamespaceEmbeddingModel,
  getNamespaceVectorStore,
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

    if (body.messages.length === 0) {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Messages must contain at least one message",
      });
    }

    const messages = convertToModelMessages(body.messages, {
      tools: agenticTools,
      ignoreIncompleteToolCalls: true,
      // re-inline the model's plan on follow-up turns
      convertDataPart: (part) =>
        part.type === "data-planning" && typeof part.data === "string"
          ? { type: "text", text: `<planning>${part.data}</planning>` }
          : undefined,
    });

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

    const languageModel = getAgenticLanguageModel(hosting.llmConfig?.model);
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
