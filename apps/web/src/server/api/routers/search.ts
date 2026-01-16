import { incrementSearchUsage } from "@/lib/api/usage";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import {
  getNamespaceEmbeddingModel,
  getNamespaceVectorStore,
  queryVectorStore,
} from "@agentset/engine";
import { rerankerSchema } from "@agentset/validation";

import { getNamespaceByUser } from "../auth";

const chunkExplorerInputSchema = z.object({
  namespaceId: z.string(),
  query: z.string().min(1),
  topK: z.number().min(1).max(100),
  rerank: z.boolean(),
  rerankModel: rerankerSchema,
  rerankLimit: z.number().min(1).max(100),
  filter: z.record(z.string(), z.any()).optional(),
});

export const searchRouter = createTRPCRouter({
  search: protectedProcedure
    .input(chunkExplorerInputSchema)
    .query(async ({ ctx, input }) => {
      const namespace = await getNamespaceByUser(ctx, {
        id: input.namespaceId,
      });

      if (!namespace) {
        throw new TRPCError({ code: "NOT_FOUND" });
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
      incrementSearchUsage(namespace.id, 1);

      return queryResult.results;
    }),
});
