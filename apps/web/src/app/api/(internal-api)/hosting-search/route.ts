import { agenticSearch } from "@/lib/agentic/search";
import { AgentsetApiError } from "@/lib/api/errors";
import { withPublicApiHandler } from "@/lib/api/handler/public";
import { hostingAuth } from "@/lib/api/hosting-auth";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { incrementSearchUsage } from "@/lib/api/usage";
import { parseRequestBody } from "@/lib/api/utils";

import { db } from "@agentset/db/client";
import {
  getNamespaceEmbeddingModel,
  getNamespaceLanguageModel,
  getNamespaceVectorStore,
  KeywordStore,
} from "@agentset/engine";

import { hostingSearchSchema } from "./schema";

// export const runtime = "edge";
export const preferredRegion = "iad1"; // make this closer to the DB
export const maxDuration = 60;

export const POST = withPublicApiHandler(
  async ({ req, searchParams, headers }) => {
    const body = await hostingSearchSchema.parseAsync(
      await parseRequestBody(req),
    );

    const namespaceId = searchParams.namespaceId;
    if (!namespaceId) {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Namespace ID is required",
      });
    }

    const hosting = await db.hosting.findFirst({
      where: {
        namespaceId,
      },
      select: {
        id: true,
        protected: true,
        allowedEmails: true,
        allowedEmailDomains: true,
        searchEnabled: true,
        rerankConfig: true,
        llmConfig: true,
        topK: true,
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

    if (!hosting) {
      throw new AgentsetApiError({
        code: "not_found",
        message: "Hosting not found",
      });
    }

    await hostingAuth(req, hosting);

    if (!hosting.searchEnabled) {
      throw new AgentsetApiError({
        code: "forbidden",
        message: "Search is disabled for this hosting",
      });
    }

    const [languageModel, vectorStore, embeddingModel] = await Promise.all([
      getNamespaceLanguageModel(hosting.llmConfig?.model),
      getNamespaceVectorStore(hosting.namespace),
      getNamespaceEmbeddingModel(hosting.namespace, "query"),
    ]);

    const keywordStore = hosting.namespace.keywordEnabled
      ? new KeywordStore(hosting.namespace.id)
      : undefined;

    const result = await agenticSearch({
      model: languageModel,
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
      messages: [
        {
          role: "user",
          content: body.query,
        },
      ],
    });

    incrementSearchUsage(hosting.namespace.id, result.totalQueries);

    return makeApiSuccessResponse({
      data: {
        totalQueries: result.totalQueries,
        queries: result.queries,
        chunks: Object.values(result.chunks),
      },
      headers,
    });
  },
);
