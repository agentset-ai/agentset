import type { LanguageModel } from "ai";
import { formatSources } from "@/lib/prompts";
import { generateText } from "ai";
import { z } from "zod/v4";

import type { QueryVectorStoreResult } from "@agentset/engine";

import {
  CORRECTNESS_SYSTEM_PROMPT,
  FAITHFULNESS_SYSTEM_PROMPT,
  RELEVANCY_SYSTEM_PROMPT,
  USER_PROMPT,
} from "./prompts";

const correctnessSchema = z.object({
  score: z.number(),
  feedback: z.string(),
});

export const correctnessEval = async (
  model: LanguageModel,
  params: {
    query: string;
    generatedAnswer: string;
  },
) => {
  const userPrompt = USER_PROMPT.compile({
    query: params.query,
    generatedAnswer: params.generatedAnswer,
  });

  const response = await generateText({
    model,
    system: CORRECTNESS_SYSTEM_PROMPT.compile(),
    prompt: userPrompt,
    temperature: 0,
  });

  return {
    ...correctnessSchema.parse(JSON.parse(response.text)),
    maxScore: 5,
  };
};

const faithfulnessSchema = z.object({
  faithful: z.boolean(),
});

export const faithfulnessEval = async (
  model: LanguageModel,
  params: {
    query: string;
    sources: QueryVectorStoreResult["results"];
  },
) => {
  const response = await generateText({
    model,
    prompt: FAITHFULNESS_SYSTEM_PROMPT.compile({
      query: params.query,
      context: formatSources(params.sources),
    }),
    temperature: 0,
  });

  return faithfulnessSchema.parse(JSON.parse(response.text));
};

const relevanceSchema = z.object({
  relevant: z.boolean(),
});

export const relevanceEval = async (
  model: LanguageModel,
  params: {
    query: string;
    generatedAnswer: string;
    sources: QueryVectorStoreResult["results"];
  },
) => {
  const response = await generateText({
    model,
    prompt: RELEVANCY_SYSTEM_PROMPT.compile({
      query: params.query,
      generatedAnswer: params.generatedAnswer,
      context: formatSources(params.sources),
    }),
    temperature: 0,
  });

  return relevanceSchema.parse(JSON.parse(response.text));
};
