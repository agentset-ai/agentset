import { z } from "zod/v4";

export const QdrantVectorStoreConfigSchema = z
  .object({
    provider: z.literal("QDRANT"),
    url: z.url().meta({
      description: "URL of the Qdrant instance.",
      example: "http://localhost:6333",
    }),
    apiKey: z
      .string()
      .optional()
      .describe("API key for Qdrant (optional for local instances)."),
  })
  .meta({
    id: "qdrant-config",
    title: "Qdrant Config",
  });
