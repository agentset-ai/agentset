import { z } from "zod/v4";

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
});

export const refineRereankLimit = <
  T extends Partial<(typeof baseQueryVectorStoreSchema)["shape"]> &
    z.ZodRawShape,
  Out extends {
    rerankLimit?: number;
    topK: number;
    [key: string]: any;
  },
>(
  schema: z.ZodObject<T, "strip", z.ZodTypeAny, Out>,
) => {
  return schema.superRefine((val, ctx) => {
    if (val.rerankLimit && val.rerankLimit > val.topK) {
      ctx.addIssue({
        path: ["rerankLimit"],
        code: z.ZodIssueCode.too_big,
        message: "rerankLimit cannot be larger than topK",
        inclusive: true,
        type: "number",
        maximum: val.topK,
      });
      return false;
    }

    return true;
  });
};

export const queryVectorStoreSchema = refineRereankLimit(
  baseQueryVectorStoreSchema,
);
