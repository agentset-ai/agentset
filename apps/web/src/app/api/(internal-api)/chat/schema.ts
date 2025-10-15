import { DEFAULT_SYSTEM_PROMPT } from "@/lib/prompts";
import { baseQueryVectorStoreSchema } from "@/schemas/api/query";
import { messagesSchema } from "@/schemas/chat";
import { z } from "zod/v4";

import {
  llmSchemaWithDefault,
  rerankerSchemaWithDefault,
} from "@agentset/validation";

export const chatSchema = baseQueryVectorStoreSchema
  .omit({ query: true })
  .extend({
    systemPrompt: z
      .string()
      .optional()
      .default(DEFAULT_SYSTEM_PROMPT.compile())
      .describe(
        "The system prompt to use for the chat. Defaults to the default system prompt.",
      ),
    messages: messagesSchema,
    temperature: z.number().optional(),
    mode: z.enum(["normal", "agentic", "deepResearch"]).optional(),
    rerankModel: rerankerSchemaWithDefault,
    llmModel: llmSchemaWithDefault,
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
