import { agenticSearch } from "@/lib/agentic/search";
import { incrementSearchUsage } from "@/lib/api/usage";
import { getNamespaceLanguageModel } from "@/lib/llm";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { KeywordStore } from "@agentset/engine";
import { queryVectorStore } from "@agentset/engine/vector-store/parse";

import { getNamespaceByUser } from "../auth";

const chunkExplorerInputSchema = z.object({
  namespaceId: z.string(),
  query: z.string().min(1, "Query is required"),
  mode: z.enum(["semantic", "keyword"]).default("semantic"),
  topK: z.number().min(1).max(100).default(20),
  minScore: z.number().min(0).max(1).optional(),
  rerank: z.boolean().default(true),
  rerankLimit: z.number().min(1).max(100).optional(),
  filter: z.record(z.string(), z.any()).optional(),
  includeMetadata: z.boolean().default(true),
  includeRelationships: z.boolean().default(false),
});

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

      const model = await getNamespaceLanguageModel();

      const results = await agenticSearch(namespace, {
        model,
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

  exploreChunks: protectedProcedure
    .input(chunkExplorerInputSchema)
    .query(async ({ ctx, input }) => {
      const namespace = await getNamespaceByUser(ctx, {
        id: input.namespaceId,
      });

      if (!namespace) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Check if keyword search is enabled when using keyword mode
      if (input.mode === "keyword" && !namespace.keywordEnabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Keyword search is not enabled for this namespace",
        });
      }

      let results;
      let queryPerformed = input.query;

      if (input.mode === "semantic") {
        const queryResult = await queryVectorStore(namespace, {
          query: input.query,
          topK: input.topK,
          minScore: input.minScore,
          filter: input.filter,
          includeMetadata: input.includeMetadata,
          includeRelationships: input.includeRelationships,
          rerankLimit: input.rerankLimit,
          rerank: input.rerank,
        });

        if (!queryResult) {
          results = [];
        } else {
          results = queryResult.results;
        }
      } else {
        // Keyword search
        const keywordStore = new KeywordStore(namespace.id);
        const keywordResult = await keywordStore.search(input.query, {
          limit: input.topK,
          minScore: input.minScore,
          includeMetadata: input.includeMetadata,
          includeRelationships: input.includeRelationships,
          filter: input.filter,
        });

        results = keywordResult.results;
      }

      // Track search usage
      incrementSearchUsage(namespace.id, 1);

      return {
        results,
        query: queryPerformed,
        mode: input.mode,
        totalResults: results.length,
        parameters: {
          topK: input.topK,
          minScore: input.minScore,
          rerank: input.rerank,
          rerankLimit: input.rerankLimit,
          filter: input.filter,
        },
      };
    }),
});
