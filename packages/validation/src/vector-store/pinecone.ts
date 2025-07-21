import { z } from "zod/v4";

export const PineconeVectorStoreConfigSchema = z
  .object({
    provider: z.literal("PINECONE"),
    apiKey: z.string().describe("The API key for the Pinecone index."),
    indexHost: z.url().describe("The host of the Pinecone index.").meta({
      example: `https://example.svc.aped-1234-a56b.pinecone.io`,
    }),
  })
  .meta({
    title: "Pinecone Config",
  });
