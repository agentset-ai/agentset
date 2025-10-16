import { z } from "zod/v4";

export const QdrantVectorStoreConfigSchema = z
  .object({
    provider: z.literal("QDRANT"),
    url: z
      .string()
      .url()
      .describe(
        "The HTTPS endpoint for your Qdrant cluster, e.g. https://your-cluster.qdrant.cloud",
      ),
    apiKey: z
      .string()
      .min(1)
      .describe("Optional API key used when the Qdrant endpoint requires auth.")
      .optional(),
  })
  .meta({
    id: "qdrant-config",
    title: "Qdrant Config",
  });
