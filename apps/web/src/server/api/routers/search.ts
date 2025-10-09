import { agenticSearch } from "@/lib/agentic/search";
import { incrementSearchUsage } from "@/lib/api/usage";
import { getNamespaceLanguageModel } from "@/lib/llm";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import {
  getNamespaceEmbeddingModel,
  getNamespaceVectorStore,
} from "@agentset/engine";

import { getNamespaceByUser } from "../auth";

export const searchRouter = createTRPCRouter({
  search: protectedProcedure
    .input(
      z.object({
        namespaceId: z.string(),
        query: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const namespace = await getNamespaceByUser(ctx, {
        id: input.namespaceId,
      });

      if (!namespace) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const [model, vectorStore, embeddingModel] = await Promise.all([
        getNamespaceLanguageModel(),
        getNamespaceVectorStore(namespace),
        getNamespaceEmbeddingModel(namespace, "query"),
      ]);

      const results = await agenticSearch({
        model,
        queryOptions: {
          embeddingModel,
          vectorStore,
          topK: 50,
          rerank: { limit: 15 },
          includeMetadata: true,
        },
        messages: [
          {
            role: "user",
            content: input.query,
          },
        ],
      });

      incrementSearchUsage(namespace.id, results.totalQueries);

      const chunks = Object.values(results.chunks);

      return {
        results: chunks,
        queries: results.queries,
      };
    }),
});
