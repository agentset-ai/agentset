/**
 * Public API Namespace Router
 *
 * Handles namespace operations for public API routes.
 */

import { AgentsetApiError, exceededLimitError } from "@/lib/api/errors";
import { normalizeId, prefixId } from "@/lib/api/ids";
import {
  createNamespaceSchema,
  NamespaceSchema,
  updateNamespaceSchema,
} from "@/schemas/api/namespace";
import { queryVectorStoreSchema } from "@/schemas/api/query";
import { apiSuccessSchema } from "@/schemas/api/response";
import { createNamespace } from "@/services/namespaces/create";
import { deleteNamespace } from "@/services/namespaces/delete";
import {
  validateEmbeddingModel,
  validateVectorStoreConfig,
} from "@/services/namespaces/validate";
import { createPublicContext } from "@/services/shared/create-public-context";
import { getNamespace as getNamespaceAccess } from "@/services/shared/namespace-access";
import { waitUntil } from "@vercel/functions";
import { z } from "zod/v4";

import type { QueryVectorStoreResult } from "@agentset/engine";
import { Prisma } from "@agentset/db";
import {
  getNamespaceEmbeddingModel,
  getNamespaceVectorStore,
  KeywordStore,
  queryVectorStore,
} from "@agentset/engine";
import { INFINITY_NUMBER } from "@agentset/utils";

import { publicApiProcedure } from "../orpc";

export const namespaceRouter = {
  /**
   * List all namespaces for the organization
   */
  list: publicApiProcedure
    .route({ method: "GET", path: "/namespace" })
    .output(apiSuccessSchema(z.array(NamespaceSchema)))
    .handler(async ({ context }) => {
      const namespaces = await context.db.namespace.findMany({
        where: {
          organizationId: context.organization.id,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      const data = namespaces.map((namespace: (typeof namespaces)[number]) =>
        NamespaceSchema.parse({
          ...namespace,
          id: prefixId(namespace.id, "ns_"),
          organizationId: prefixId(namespace.organizationId, "org_"),
        }),
      );
      return { success: true, data };
    }),

  /**
   * Create a new namespace
   */
  create: publicApiProcedure
    .route({ method: "POST", path: "/namespace", successStatus: 201 })
    .input(createNamespaceSchema)
    .output(apiSuccessSchema(NamespaceSchema))
    .handler(async ({ context, input }) => {
      const { success: isValidVectorStore, error: vectorStoreError } =
        await validateVectorStoreConfig(
          input.vectorStoreConfig,
          input.embeddingConfig,
        );
      if (!isValidVectorStore) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: vectorStoreError,
        });
      }

      const { success: isValidEmbedding, error: embeddingError } =
        await validateEmbeddingModel(input.embeddingConfig);
      if (!isValidEmbedding) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: embeddingError,
        });
      }

      const serviceContext = createPublicContext(
        context.headers,
        context.organization.id,
      );

      try {
        const namespace = await createNamespace(serviceContext, {
          ...input,
          orgId: context.organization.id,
        });

        const data = NamespaceSchema.parse({
          ...namespace,
          id: prefixId(namespace.id, "ns_"),
          organizationId: prefixId(namespace.organizationId, "org_"),
        });
        return { success: true, data };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new AgentsetApiError({
            code: "conflict",
            message: `The slug "${input.slug}" is already in use.`,
          });
        }
        throw error;
      }
    }),

  /**
   * Get a namespace by ID
   */
  get: publicApiProcedure
    .route({ method: "GET", path: "/namespace/{namespaceId}" })
    .input(
      z.object({
        namespaceId: z.string(),
      }),
    )
    .output(apiSuccessSchema(NamespaceSchema))
    .handler(async ({ context, input }) => {
      const namespaceId = normalizeId(input.namespaceId, "ns_");
      if (!namespaceId) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Invalid namespace ID.",
        });
      }

      const serviceContext = createPublicContext(
        context.headers,
        context.organization.id,
      );
      const namespace = await getNamespaceAccess(serviceContext, {
        id: namespaceId,
      });

      const data = NamespaceSchema.parse({
        ...namespace,
        id: prefixId(namespace.id, "ns_"),
        organizationId: prefixId(namespace.organizationId, "org_"),
      });
      return { success: true, data };
    }),

  /**
   * Update a namespace
   */
  update: publicApiProcedure
    .route({ method: "PATCH", path: "/namespace/{namespaceId}" })
    .input(
      z
        .object({
          namespaceId: z.string(),
        })
        .extend(updateNamespaceSchema.shape),
    )
    .output(apiSuccessSchema(NamespaceSchema))
    .handler(async ({ context, input }) => {
      const { namespaceId: rawNamespaceId, ...updateData } = input;
      const namespaceId = normalizeId(rawNamespaceId, "ns_");
      if (!namespaceId) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Invalid namespace ID.",
        });
      }

      const serviceContext = createPublicContext(
        context.headers,
        context.organization.id,
      );
      const namespace = await getNamespaceAccess(serviceContext, {
        id: namespaceId,
      });

      try {
        const updatedNamespace = await context.db.namespace.update({
          where: { id: namespaceId },
          data: {
            ...(updateData.name && { name: updateData.name }),
            ...(updateData.slug && { slug: updateData.slug }),
          },
        });

        const data = NamespaceSchema.parse({
          ...updatedNamespace,
          id: prefixId(updatedNamespace.id, "ns_"),
          organizationId: prefixId(updatedNamespace.organizationId, "org_"),
        });
        return { success: true, data };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new AgentsetApiError({
            code: "conflict",
            message: `The slug "${updateData.slug}" is already in use.`,
          });
        }
        throw error;
      }
    }),

  /**
   * Delete a namespace
   */
  delete: publicApiProcedure
    .route({ method: "DELETE", path: "/namespace/{namespaceId}" })
    .input(
      z.object({
        namespaceId: z.string(),
      }),
    )
    .output(apiSuccessSchema(z.object({ success: z.boolean() })))
    .handler(async ({ context, input }) => {
      const namespaceId = normalizeId(input.namespaceId, "ns_");
      if (!namespaceId) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Invalid namespace ID.",
        });
      }

      const serviceContext = createPublicContext(
        context.headers,
        context.organization.id,
      );
      const namespace = await getNamespaceAccess(serviceContext, {
        id: namespaceId,
      });

      await deleteNamespace(serviceContext, {
        namespaceId: namespace.id,
      });

      return { success: true, data: { success: true } };
    }),

  /**
   * Search a namespace
   */
  search: publicApiProcedure
    .route({ method: "POST", path: "/namespace/{namespaceId}/search" })
    .input(
      z
        .object({
          namespaceId: z.string(),
        })
        .extend(queryVectorStoreSchema.shape),
    )
    .output(apiSuccessSchema(z.array(z.any()))) // TODO: Use proper NodeSchema
    .handler(async ({ context, input }) => {
      const { namespaceId: rawNamespaceId, ...queryInput } = input;

      // Check rate limits
      if (
        INFINITY_NUMBER !== context.organization.searchLimit &&
        context.organization.searchUsage >= context.organization.searchLimit
      ) {
        throw new AgentsetApiError({
          code: "rate_limit_exceeded",
          message: exceededLimitError({
            plan: context.organization.plan,
            limit: context.organization.searchLimit,
            type: "retrievals",
          }),
        });
      }

      const namespaceId = normalizeId(rawNamespaceId, "ns_");
      if (!namespaceId) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Invalid namespace ID.",
        });
      }

      const serviceContext = createPublicContext(
        context.headers,
        context.organization.id,
      );
      const namespace = await getNamespaceAccess(serviceContext, {
        id: namespaceId,
      });

      const isPinecone =
        namespace.vectorStoreConfig?.provider === "MANAGED_PINECONE" ||
        namespace.vectorStoreConfig?.provider === "MANAGED_PINECONE_OLD" ||
        namespace.vectorStoreConfig?.provider === "PINECONE";

      if (
        queryInput.mode === "keyword" &&
        isPinecone &&
        !namespace.keywordEnabled
      ) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Keyword search is not enabled for this namespace",
        });
      }

      const [embeddingModel, vectorStore] = await Promise.all([
        getNamespaceEmbeddingModel(namespace, "query"),
        getNamespaceVectorStore(namespace, context.tenantId),
      ]);

      let results: QueryVectorStoreResult["results"] | undefined = [];

      if (queryInput.mode === "keyword" && isPinecone) {
        const store = new KeywordStore(namespace.id, context.tenantId);
        const searchResult = await store.search(queryInput.query, {
          limit: queryInput.topK,
          minScore: queryInput.minScore,
          includeMetadata: queryInput.includeMetadata,
          includeRelationships: queryInput.includeRelationships,
          filter: queryInput.keywordFilter,
        });
        results = searchResult.results;
      } else {
        const queryResult = await queryVectorStore({
          embeddingModel,
          vectorStore,
          query: queryInput.query,
          mode: queryInput.mode,
          topK: queryInput.topK,
          minScore: queryInput.minScore,
          filter: queryInput.filter,
          includeMetadata: queryInput.includeMetadata,
          includeRelationships: queryInput.includeRelationships,
          rerank: queryInput.rerank
            ? {
                model: queryInput.rerankModel,
                limit: queryInput.rerankLimit,
              }
            : false,
        });
        results = queryResult?.results;
      }

      if (!results || results.length === 0) {
        return { success: true, data: [] };
      }

      // Track usage
      waitUntil(
        (async () => {
          await context.db.organization.update({
            where: {
              id: context.organization.id,
            },
            data: {
              searchUsage: { increment: 1 },
            },
          });
        })(),
      );

      return { success: true, data: results };
    }),

  /**
   * Warm up namespace cache
   */
  warmUp: publicApiProcedure
    .route({ method: "POST", path: "/namespace/{namespaceId}/warm-up" })
    .input(
      z.object({
        namespaceId: z.string(),
      }),
    )
    .output(apiSuccessSchema(z.object({ status: z.boolean() })))
    .handler(async ({ context, input }) => {
      const namespaceId = normalizeId(input.namespaceId, "ns_");
      if (!namespaceId) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Invalid namespace ID.",
        });
      }

      const serviceContext = createPublicContext(
        context.headers,
        context.organization.id,
      );
      const namespace = await getNamespaceAccess(serviceContext, {
        id: namespaceId,
      });

      const vectorStore = await getNamespaceVectorStore(
        namespace,
        context.tenantId,
      );
      const result = await vectorStore.warmCache();

      if (result === "UNSUPPORTED") {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "Warm cache is not supported for this vector store",
        });
      }

      return { success: true, data: { status: true } };
    }),
};
