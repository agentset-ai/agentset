import { DEFAULT_SYSTEM_PROMPT } from "@/lib/prompts";
import { z } from "zod/v4";

import { llmSchemaWithDefault } from "@agentset/validation";

import { NodeSchema } from "./node";
import { baseQueryVectorStoreSchema } from "./query";

export const chatOptionsSchema = baseQueryVectorStoreSchema
  .omit({ query: true, mode: true, keywordFilter: true })
  .extend({
    systemPrompt: z
      .string()
      .optional()
      .default(DEFAULT_SYSTEM_PROMPT.compile())
      .describe(
        "The system prompt to use for the chat. Defaults to the default system prompt.",
      ),
    temperature: z
      .number()
      .optional()
      .describe("The temperature to use when generating the answer."),
    mode: z
      .enum(["normal", "agentic", "deepResearch"])
      .optional()
      .default("normal")
      .describe(
        "The mode to use for the chat. `normal` runs a single retrieval, `agentic` lets the model generate and evaluate search queries, and `deepResearch` runs an iterative research pipeline. Defaults to `normal`.",
      ),
    llmModel: llmSchemaWithDefault.describe(
      "The LLM to use when generating the answer.",
    ),
  });

export const chatMessageSchema = z
  .object({
    role: z
      .enum(["user", "assistant"])
      .describe("The role of the message author."),
    content: z.string().min(1).describe("The text content of the message."),
  })
  .meta({
    id: "chat-message",
    title: "Chat Message",
  });

export const chatSchema = chatOptionsSchema
  .extend({
    messages: z
      .array(chatMessageSchema)
      .min(1)
      .describe(
        "The conversation so far. The last message must be from the user, it will be used as the query.",
      ),
    stream: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Whether to stream the response as an AI SDK UI message stream (server-sent events). Defaults to `false`.",
      ),
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

export const chatResponseSchema = z
  .object({
    message: z.object({
      role: z.literal("assistant").describe("The role of the message author."),
      content: z
        .string()
        .describe("The text content of the generated message."),
    }),
    sources: NodeSchema.array()
      .optional()
      .describe(
        "The chunks retrieved from the namespace to generate the answer. Not returned in `deepResearch` mode.",
      ),
  })
  .meta({
    id: "chat-response",
    title: "Chat Response",
  });
