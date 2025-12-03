/**
 * Benchmark Router
 *
 * Handles benchmark evaluation operations.
 */

import { DEFAULT_SYSTEM_PROMPT } from "@/lib/prompts";
import { baseQueryVectorStoreSchema } from "@/schemas/api/query";
import { protectedProcedure } from "@/server/orpc/orpc";
import { evaluateBenchmark } from "@/services/benchmark/evaluate";
import { toProtectedAgentsetContext } from "@/services/shared/adapters";
import { z } from "zod/v4";

const benchmarkInputSchema = baseQueryVectorStoreSchema
  .omit({ query: true })
  .extend({
    namespaceId: z.string(),
    systemPrompt: z
      .string()
      .optional()
      .default(DEFAULT_SYSTEM_PROMPT.compile())
      .describe(
        "The system prompt to use for the chat. Defaults to the default system prompt.",
      ),
    message: z.string(),
    temperature: z.number().optional(),
    mode: z.enum(["normal", "agentic"]).optional(),
  })
  .check((ctx) => {
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
  });

export const benchmarkRouter = {
  evaluate: protectedProcedure
    .input(benchmarkInputSchema)
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await evaluateBenchmark(serviceContext, input);
    }),
};

