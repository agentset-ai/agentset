import { z } from "zod/v4";

import { rerankerSchemaWithDefault } from "@agentset/validation";

export const baseQueryVectorStoreSchema = z.object({
  query: z.string().describe("The query to search for."),
  topK: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(10)
    .describe(
      "The number of results to fetch from the vector store. Defaults to `10`.",
    ),
  rerank: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether to rerank the results. Defaults to `true`."),
  rerankLimit: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .describe(
      "The number of results to return after reranking. Defaults to `topK`.",
    ),
  rerankModel: rerankerSchemaWithDefault.describe(
    "The reranking model to use.",
  ),
  filter: z
    .record(z.string(), z.any())
    .optional()
    .describe("A filter to apply to the results."),
  minScore: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("The minimum score to return."),
  includeRelationships: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Whether to include relationships in the results. Defaults to `false`.",
    ),
  includeMetadata: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      "Whether to include metadata in the results. Defaults to `true`.",
    ),
  keywordFilter: z.string().optional(),
  // TODO: add hybrid
  mode: z.enum(["semantic", "keyword"]).optional().default("semantic"),
});

export const queryVectorStoreSchema = baseQueryVectorStoreSchema.check(
  (ctx) => {
    if (ctx.value.rerankLimit && ctx.value.rerankLimit > ctx.value.topK) {
      ctx.issues.push({
        path: ["rerankLimit"],
        code: "too_big",
        message: "rerankLimit cannot be larger than topK",
        inclusive: true,
        type: "number",
        maximum: ctx.value.topK,
        input: ctx.value.rerankLimit,
        origin: "number",
      });
    }
  },
);
