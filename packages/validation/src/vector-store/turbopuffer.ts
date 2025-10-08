import { z } from "zod/v4";

export const TurbopufferVectorStoreConfigSchema = z
  .object({
    provider: z.literal("TURBOPUFFER"),
    apiKey: z.string().describe("The API key for the Turbopuffer index."),
  })
  .meta({
    id: "turbopuffer-config",
    title: "Turbopuffer Config",
  });
