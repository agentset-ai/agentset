import { AgentsetApiError, exceededLimitError } from "@/lib/api/errors";
import { withNamespaceApiHandler } from "@/lib/api/handler";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { parseRequestBody } from "@/lib/api/utils";
import { queryVectorStoreSchema } from "@/schemas/api/query";
import { waitUntil } from "@vercel/functions";

import type { QueryVectorStoreResult } from "@agentset/engine";
import { db } from "@agentset/db";
import { KeywordStore, queryVectorStore } from "@agentset/engine";
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

    if (!namespace.keywordEnabled && body.mode === "keyword") {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Keyword search is not enabled for this namespace",
      });
    }

    let results: QueryVectorStoreResult["results"] | undefined = [];

    // TODO: track the usage
    if (body.mode === "semantic") {
      results = (
        await queryVectorStore(namespace, {
          query: body.query,
          tenantId,
          topK: body.topK,
          minScore: body.minScore,
          filter: body.filter,
          includeMetadata: body.includeMetadata,
          includeRelationships: body.includeRelationships,
          rerankLimit: body.rerankLimit,
          rerank: body.rerank,
        })
      )?.results;
    } else if (body.mode === "keyword") {
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
