import { AgentsetApiError, exceededLimitError } from "@/lib/api/errors";
import { withNamespaceApiHandler } from "@/lib/api/handler";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { parseRequestBody } from "@/lib/api/utils";
import { queryVectorStoreSchema } from "@/schemas/api/query";
import { waitUntil } from "@vercel/functions";

import type { QueryVectorStoreResult } from "@agentset/engine";
import { db } from "@agentset/db/client";
import {
  getNamespaceEmbeddingModel,
  getNamespaceVectorStore,
  KeywordStore,
  queryVectorStore,
} from "@agentset/engine";
import { INFINITY_NUMBER } from "@agentset/utils";

// export const runtime = "edge";
export const preferredRegion = "iad1"; // make this closer to the DB

export const POST = withNamespaceApiHandler(
  async ({ req, namespace, tenantId, organization, headers }) => {
    // if it's not a pro plan, check if the user has exceeded the limit
    // pro plan is unlimited but has INFINITY_NUMBER in the db
    // TODO: set hard limits to prevent abuse
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

    const body = await queryVectorStoreSchema.parseAsync(
      await parseRequestBody(req),
    );

    const isPinecone =
      namespace.vectorStoreConfig?.provider === "MANAGED_PINECONE" ||
      namespace.vectorStoreConfig?.provider === "MANAGED_PINECONE_OLD" ||
      namespace.vectorStoreConfig?.provider === "PINECONE";

    if (body.mode === "keyword" && isPinecone && !namespace.keywordEnabled) {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Keyword search is not enabled for this namespace",
      });
    }

    const [embeddingModel, vectorStore] = await Promise.all([
      getNamespaceEmbeddingModel(namespace, "query"),
      getNamespaceVectorStore(namespace, tenantId),
    ]);

    let results: QueryVectorStoreResult["results"] | undefined = [];

    // TODO: track the usage
    if (body.mode === "keyword" && isPinecone) {
      const store = new KeywordStore(namespace.id, tenantId);
      results = (
        await store.search(body.query, {
          limit: body.topK,
          minScore: body.minScore,
          includeMetadata: body.includeMetadata,
          includeRelationships: body.includeRelationships,
          filter: body.keywordFilter,
        })
      ).results;
    } else {
      results = (
        await queryVectorStore({
          embeddingModel,
          vectorStore,
          query: body.query,
          mode: body.mode,
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
        })
      )?.results;
    }

    if (!results) {
      throw new AgentsetApiError({
        code: "internal_server_error",
        message: "Failed to parse vector store results",
      });
    }

    waitUntil(
      (async () => {
        // track usage
        await db.organization.update({
          where: {
            id: organization.id,
          },
          data: {
            searchUsage: { increment: 1 },
          },
        });
      })(),
    );

    return makeApiSuccessResponse({
      data: results,
      headers,
    });
  },
  { logging: { routeName: "POST /v1/namespace/[namespaceId]/search" } },
);
