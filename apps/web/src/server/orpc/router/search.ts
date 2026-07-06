import {
  checkSearchLimit,
  incrementOrganizationSearchUsage,
} from "@/lib/api/usage";
import { NodeSchema } from "@/schemas/api/node";
import { namespaceIdPathSchema } from "@/schemas/api/params";
import { queryVectorStoreSchema } from "@/schemas/api/query";
import {
  api,
  protectedProcedure,
  requireNamespace,
  successSchema,
} from "@/server/orpc/base";
import { searchNamespace } from "@/services/search";
import { toOpenAPISchema } from "@orpc/openapi";
import { ORPCError, type } from "@orpc/server";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { z } from "zod/v4";

import type { QueryVectorStoreResult } from "@agentset/engine";
import {
  getNamespaceEmbeddingModel,
  getNamespaceVectorStore,
  queryVectorStore,
} from "@agentset/engine";
import { rerankerSchema } from "@agentset/validation";

import { makeCodeSamples, ts } from "./code-samples";
import { getNamespaceByUser } from "./helpers";

const search = api
  .route({
    method: "POST",
    path: "/namespace/{namespaceId}/search",
    operationId: "search",
    summary: "Search a namespace",
    description: "Search a namespace for a query.",
    tags: ["Search"],
    spec: (current) => {
      // The handler returns the raw service results without an output parse
      // (parity with the legacy route), so the 200 response is documented
      // here from the old spec file instead of via `.output()`.
      const [, responseJsonSchema] = new ZodToJsonSchemaConverter().convert(
        successSchema(z.array(NodeSchema)),
        { strategy: "output" },
      );

      return {
        ...current,
        "x-speakeasy-name-override": "execute",
        "x-speakeasy-group": "search",
        security: [{ token: [] }],
        responses: {
          "200": {
            description: "The retrieved namespace",
            content: {
              "application/json": {
                schema: toOpenAPISchema(responseJsonSchema),
              },
            },
          },
        },
        ...makeCodeSamples(ts`
const results = await ns.search("What is machine learning?", {
  topK: 20,
  rerank: true,
  rerankLimit: 10,
});
console.log(results);
`),
      };
    },
  })
  .input(queryVectorStoreSchema.extend({ namespaceId: namespaceIdPathSchema }))
  .use(requireNamespace, (input) => input.namespaceId)
  .output(type<{ success: true; data: QueryVectorStoreResult["results"] }>())
  .handler(async ({ context, input }) => {
    // TODO: set hard limits to prevent abuse
    checkSearchLimit(context.organization);

    const { namespaceId: _namespaceId, ...options } = input;

    const results = await searchNamespace({
      namespace: context.namespace,
      tenantId: context.tenantId,
      options,
    });

    incrementOrganizationSearchUsage(context.organization.id, 1);

    return { success: true as const, data: results };
  });

const chunkExplorerInputSchema = z.object({
  namespaceId: z.string(),
  query: z.string().min(1),
  topK: z.number().min(1).max(100),
  rerank: z.boolean(),
  rerankModel: rerankerSchema,
  rerankLimit: z.number().min(1).max(100),
  filter: z.record(z.string(), z.any()).optional(),
});

const playground = protectedProcedure
  .input(chunkExplorerInputSchema)
  .handler(async ({ context, input }) => {
    const namespace = await getNamespaceByUser(context, {
      id: input.namespaceId,
    });

    if (!namespace) {
      throw new ORPCError("NOT_FOUND");
    }

    const [embeddingModel, vectorStore] = await Promise.all([
      getNamespaceEmbeddingModel(namespace, "query"),
      getNamespaceVectorStore(namespace),
    ]);

    const queryResult = await queryVectorStore({
      query: input.query,
      topK: input.topK,
      filter: input.filter,
      includeMetadata: true,
      rerank: input.rerank
        ? { model: input.rerankModel, limit: input.rerankLimit }
        : false,
      embeddingModel,
      vectorStore,
      consistency: "strong",
    });

    // Track search usage
    incrementOrganizationSearchUsage(namespace.organizationId, 1);

    return queryResult.results;
  });

export const searchRouter = {
  search,
  playground,
};
