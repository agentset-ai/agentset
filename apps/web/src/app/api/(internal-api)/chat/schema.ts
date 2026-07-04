import { baseQueryVectorStoreSchema } from "@/schemas/api/query";
import { messagesSchema } from "@/schemas/chat";
import { z } from "zod/v4";

import {
  llmSchemaWithDefault,
  rerankerSchemaWithDefault,
} from "@agentset/validation";

export const chatSchema = baseQueryVectorStoreSchema
  .omit({ query: true, topK: true, rerankLimit: true })
  .extend({
    topK: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .default(30)
      .describe(
        "The number of results to fetch from the vector store for each semantic search. Defaults to `30`.",
      ),
    rerankLimit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .default(10)
      .describe(
        "The number of results the model sees per search. Defaults to `10`.",
      ),
    systemPrompt: z
      .string()
      .optional()
      .describe(
        "Custom instructions for the chat. Defaults to the agentic search system prompt; custom prompts are augmented with the platform tool and citation contract.",
      ),
    messages: messagesSchema,
    temperature: z.number().optional(),
    mode: z
      .enum(["accurate", "fast", "normal", "agentic", "deepResearch"])
      .optional()
      .default("accurate")
      // legacy modes (normal/agentic/deepResearch) map to accurate
      .transform((mode) =>
        mode === "fast" ? ("fast" as const) : ("accurate" as const),
      )
      .describe(
        "accurate: reranked agentic search (default). fast: agentic search without reranking.",
      ),
    rerankModel: rerankerSchemaWithDefault,
    llmModel: llmSchemaWithDefault,
  });
// note: rerankLimit > topK is clamped in the route instead of rejected, since
// both fields have defaults and legacy clients may send mismatched pairs
