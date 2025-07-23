import { DEFAULT_SYSTEM_PROMPT } from "@/lib/prompts";
import { baseQueryVectorStoreSchema } from "@/schemas/api/query";
import { coreMessageSchema } from "ai";
import { z } from "zod/v4";

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
    messages: z.array(coreMessageSchema),
    temperature: z.number().optional(),
    mode: z.enum(["normal", "agentic", "deepResearch"]).optional(),
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
