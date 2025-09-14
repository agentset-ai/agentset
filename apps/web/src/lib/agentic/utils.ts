import type { LanguageModel, ModelMessage } from "ai";
import { generateText } from "ai";
import { z } from "zod/v4";

import type { QueryVectorStoreResult } from "@agentset/engine";

import { EVALUATE_QUERIES_PROMPT, GENERATE_QUERIES_PROMPT } from "./prompts";

export const formatChatHistory = (messages: ModelMessage[]) => {
  return messages.map((m) => `${m.role}: ${m.content as string}`).join("\n\n");
};

export const formatSources = (sources: QueryVectorStoreResult["results"]) => {
  return sources
    .map((s, idx) => `<source_${idx + 1}>\n${s.text}\n</source_${idx + 1}>`)
    .join("\n\n");
};

const schema = z.object({
  queries: z.array(
    z.object({
      type: z.enum(["keyword", "semantic"]),
      query: z.string(),
    }),
  ),
});

export type Queries = z.infer<typeof schema>["queries"];

export const generateQueries = async (
  model: LanguageModel,
  messages: ModelMessage[],
  oldQueries: Queries,
) => {
  const queriesResult = await generateText({
    model,
    temperature: 0,
    system: GENERATE_QUERIES_PROMPT,
    prompt: `
${
  oldQueries.length > 0
    ? "The queries you return should be different from these ones that were tried so far:\n" +
      oldQueries.map((q) => `- ${q.query}`).join("\n")
    : ""
}

Chat history:
${formatChatHistory(messages)}
`.trim(),
  });

  return {
    queries: schema.parse(JSON.parse(queriesResult.text)).queries,
    totalTokens: queriesResult.usage.totalTokens || 0,
  };
};

const evalSchema = z.object({
  canAnswer: z.boolean(),
});

export const evaluateQueries = async (
  model: LanguageModel,
  messages: ModelMessage[],
  sources: QueryVectorStoreResult["results"],
) => {
  const evaluateQueriesResult = await generateText({
    model,
    temperature: 0,
    system: EVALUATE_QUERIES_PROMPT,
    prompt: `
Chat history:
${formatChatHistory(messages)}

Retrieved sources:
${formatSources(sources)}
 `,
  });

  return {
    canAnswer: evalSchema.parse(JSON.parse(evaluateQueriesResult.text))
      .canAnswer,
    totalTokens: evaluateQueriesResult.usage.totalTokens || 0,
  };
};
