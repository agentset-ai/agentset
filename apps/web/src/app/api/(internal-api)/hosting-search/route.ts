import { AgentsetApiError } from "@/lib/api/errors";
import { withPublicApiHandler } from "@/lib/api/handler/public";
import { hostingAuth } from "@/lib/api/hosting-auth";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { incrementSearchUsage } from "@/lib/api/usage";
import { parseRequestBody } from "@/lib/api/utils";

import { db } from "@agentset/db/client";
import {
  getNamespaceEmbeddingModel,
  getNamespaceVectorStore,
  queryVectorStore,
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

    const [vectorStore, embeddingModel] = await Promise.all([
      getNamespaceVectorStore(hosting.namespace),
      getNamespaceEmbeddingModel(hosting.namespace, "query"),
    ]);

    const result = await queryVectorStore({
      embeddingModel,
      vectorStore,
      query: body.query,
      mode: "semantic",
      topK: hosting.topK,
      rerank: {
        model: hosting.rerankConfig?.model,
        limit: hosting.rerankConfig?.limit ?? 15,
      },
      includeMetadata: true,
    });

    incrementSearchUsage(hosting.namespace.id, 1);

    return makeApiSuccessResponse({
      data: result.results,
      headers,
    });
  },
);
