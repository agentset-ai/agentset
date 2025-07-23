import { z } from "zod/v4";

export const googleEmbeddingModelEnum = z.enum(["text-embedding-004"]);

export const GoogleEmbeddingConfigSchema = z
  .object({
    provider: z.literal("GOOGLE"),
    model: googleEmbeddingModelEnum,
    apiKey: z.string(),
  })
  .meta({
    title: "Google Embedding Config",
  });
