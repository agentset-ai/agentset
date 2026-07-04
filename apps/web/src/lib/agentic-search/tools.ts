import type { EmbeddingModel, ToolSet } from "ai";
import { tool } from "ai";
import { z } from "zod/v4";

import type { VectorStore } from "@agentset/engine";
import type { RerankingModel } from "@agentset/validation";
import { expandChunk, queryVectorStore } from "@agentset/engine";

import type { FormattedChunk } from "./format-chunk";
import { formatChunk, formatChunkForModel } from "./format-chunk";

export type SearchToolConfig = {
  /** how many chunks to fetch for a semantic search (pre-rerank) */
  topK: number;
  /** how many chunks to fetch for a keyword search (never reranked) */
  keywordTopK: number;
  /** reranking for semantic searches; `false` disables it (fast mode) */
  rerank: false | { model?: RerankingModel; limit: number };
};

// passed out-of-band to the tools via `experimental_context`, so the model
// can't influence retrieval configuration
export type AgenticToolContext = {
  vectorStore: VectorStore;
  embeddingModel: EmbeddingModel;
  search: SearchToolConfig;
  /** called once per vector store query, used for usage metering */
  onQuery?: () => void;
};

const getContext = (experimental_context: unknown): AgenticToolContext => {
  const context = experimental_context as AgenticToolContext | undefined;
  if (!context?.vectorStore) {
    throw new Error("Agentic search tools are missing their tool context");
  }
  return context;
};

const searchInputSchema = z.object({
  query: z.string().describe("The query to search for."),
  mode: z
    .enum(["semantic", "keyword"])
    .describe(
      "semantic: embedding similarity search, best for concepts and paraphrases. keyword: full-text search, best for exact terms, names, and identifiers. Keyword search is not available on every knowledge base; when unavailable, the search runs in semantic mode instead.",
    ),
  label: z
    .string()
    .describe(
      "A concise, human-readable description of what this search is looking for, in the user's language. Shown in the UI only; does NOT affect retrieval.",
    ),
});

const searchKnowledgeBase = tool<
  z.infer<typeof searchInputSchema>,
  FormattedChunk[]
>({
  description: "A tool for searching the knowledge base.",
  inputSchema: searchInputSchema,
  execute: async ({ query, mode }, { experimental_context }) => {
    const context = getContext(experimental_context);

    // some vector stores (e.g. Pinecone) don't support keyword search
    const finalMode = context.vectorStore.supportsKeyword() ? mode : "semantic";

    const result = await queryVectorStore({
      query,
      mode: finalMode,
      vectorStore: context.vectorStore,
      embeddingModel: context.embeddingModel,
      topK:
        finalMode === "semantic"
          ? context.search.topK
          : context.search.keywordTopK,
      rerank: finalMode === "semantic" ? context.search.rerank : false,
      includeMetadata: true,
    });

    context.onQuery?.();
    return result.results.map(formatChunk);
  },
  toModelOutput: (output) => ({
    type: "json",
    value: output.map(formatChunkForModel),
  }),
});

const expandInputSchema = z.object({
  documentId: z
    .string()
    .describe(
      "The documentId of the chunk to expand, exactly as returned by search.",
    ),
  sequence_number: z
    .number()
    .describe(
      "The sequence_number of the chunk to expand, exactly as returned by search.",
    ),
});

const expandChunkTool = tool<
  z.infer<typeof expandInputSchema>,
  FormattedChunk[]
>({
  description:
    "A tool for expanding a chunk of text by getting the chunks around it in the same document.",
  inputSchema: expandInputSchema,
  execute: async (
    { documentId, sequence_number },
    { experimental_context },
  ) => {
    const context = getContext(experimental_context);

    // gets 10 chunks around the given chunk, 5 before and 5 after
    const results = await expandChunk({
      vectorStore: context.vectorStore,
      documentId,
      sequenceNumber: sequence_number,
      limit: 10,
    });

    context.onQuery?.();
    return results.map(formatChunk);
  },
  toModelOutput: (output) => ({
    type: "json",
    value: output.map(formatChunkForModel),
  }),
});

export const agenticTools = {
  search: searchKnowledgeBase,
  expand: expandChunkTool,
} satisfies ToolSet;

export type AgenticTools = typeof agenticTools;
