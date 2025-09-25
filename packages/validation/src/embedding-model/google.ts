import { z } from "zod/v4";

export const googleEmbeddingModelEnum = z.enum(["text-embedding-004"]).meta({
  id: "google-embedding-model-enum",
});

export const GoogleEmbeddingConfigSchema = z
  .object({
    provider: z.literal("GOOGLE"),
    model: googleEmbeddingModelEnum,
    apiKey: z.string(),
  })
  .meta({
    id: "google-embedding-config",
    title: "Google Embedding Config",
  });
