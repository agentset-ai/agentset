import { z } from "zod/v4";

export const crawlPayloadSchema = z
  .object({
    type: z.literal("CRAWL"),
    url: z.url().describe("The starting URL to crawl."),
    maxDepth: z
      .int()
      .min(1)
      .describe(
        "Maximum depth to follow links from the starting URL. Depth 1 means only the initial page. Defaults to `5`.",
      )
      .optional(),
    limit: z
      .int()
      .min(1)
      .describe(
        "Maximum number of pages to crawl before stopping. Helps bound large sites. Defaults to `50`.",
      )
      .optional(),
    includePaths: z
      .array(z.string())
      .describe(
        "Only crawl URLs whose path matches at least one of these prefixes.",
      )
      .optional(),
    excludePaths: z
      .array(z.string())
      .describe("Never crawl URLs whose path matches these prefixes.")
      .optional(),
    headers: z
      .record(z.string(), z.string())
      .describe(
        "Custom HTTP headers to send with crawl requests (for example, auth headers).",
      )
      .optional(),
  })
  .meta({
    id: "crawl-payload",
    title: "Crawl Payload",
  });
