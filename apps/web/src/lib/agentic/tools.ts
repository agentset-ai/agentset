import { InferUITools, tool, ToolSet } from "ai";
import z from "zod/v4";

import {
  KeywordStore,
  queryVectorStore,
  QueryVectorStoreOptions,
  QueryVectorStoreResult,
} from "@agentset/engine";

const formatChunks = (chunks: QueryVectorStoreResult["results"]) => {
  return chunks.map((chunk) => ({
    id: chunk.id,
    text: chunk.text,
    metadata: chunk.metadata ?? {},
  }));
};

export interface GetAgenticToolsOptions {
  embeddingModel: QueryVectorStoreOptions["embeddingModel"];
  vectorStore: QueryVectorStoreOptions["vectorStore"];
  rerank?: QueryVectorStoreOptions["rerank"];
  topK?: number;
  keywordStore?: KeywordStore;
}

export const getAgenticTools = ({
  embeddingModel,
  vectorStore,
  topK,
  rerank,
  keywordStore,
}: GetAgenticToolsOptions) => {
  const semanticSearchTool = tool({
    description: "Semantic search tool",
    inputSchema: z.object({
      query: z.string().describe("The query to search for."),
    }),
    execute: async ({ query }) => {
      const queryResult = await queryVectorStore({
        embeddingModel,
        vectorStore,
        query,
        mode: "semantic",
        topK: topK ?? 50,
        rerank: rerank ?? { model: "zeroentropy:zerank-2", limit: 10 },
        includeMetadata: true,
      });

      return formatChunks(queryResult.results);
    },
  });

  const supportsKeyword = vectorStore.supportsKeyword() || !!keywordStore;

  const keywordSearchTool = supportsKeyword
    ? tool({
        description: "Keyword search tool",
        inputSchema: z.object({
          query: z.string().describe("The query to search for."),
        }),
        execute: async ({ query }) => {
          if (keywordStore) {
            const result = await keywordStore.search(query, {
              limit: 10,
              includeMetadata: true,
            });
            return formatChunks(result.results);
          }

          const result = await queryVectorStore({
            query,
            embeddingModel,
            vectorStore,
            mode: "keyword",
            topK: 10,
            rerank: false,
            includeMetadata: true,
          });

          return formatChunks(result.results);
        },
      })
    : null;

  const expandTool = tool({
    description:
      "You can use this tool to expand a certain chunk. You need to provide the documentId and the sequence number of the chunk and you will get a list of chunks before and after the chunk.",
    inputSchema: z.object({
      query: z.string(),
      documentId: z.string(),
      sequenceNumber: z.number(),
    }),
    execute: async ({ query, documentId, sequenceNumber }) => {
      const result = await queryVectorStore({
        topK: 10,
        query,
        embeddingModel,
        vectorStore,
        rerank: false,
        mode: "semantic",
        filter: {
          $and: [
            { documentId: { $eq: documentId } },
            {
              ...(sequenceNumber === 0
                ? {
                    sequence_number: { $gt: sequenceNumber },
                  }
                : {
                    $or: [
                      { sequence_number: { $lt: sequenceNumber } },
                      { sequence_number: { $gt: sequenceNumber } },
                    ],
                  }),
            },
          ],
        },
      });

      return formatChunks(result.results);
    },
  });

  return {
    semantic_search: semanticSearchTool,
    ...(keywordSearchTool ? { keyword_search: keywordSearchTool } : {}),
    expand: expandTool,
  } satisfies ToolSet;
};

export type AgenticTools = InferUITools<ReturnType<typeof getAgenticTools>>;
