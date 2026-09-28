import { afterEach, describe, expect, it, vi } from "vitest";

const loadValidation = async (region: "us" | "eu" | undefined) => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);

  return import("@agentset/validation");
};

const loadCreateIngestJobSchema = async (region: "us" | "eu" | undefined) => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);

  const { createIngestJobSchema } = await import("@/schemas/api/ingest-job");
  return createIngestJobSchema;
};

afterEach(() => {
  vi.unstubAllEnvs();
});

const crawlPayload = { type: "CRAWL", url: "https://example.com" };
const youtubePayload = {
  type: "YOUTUBE",
  urls: ["https://www.youtube.com/watch?v=abc"],
};

const availablePayloads = [
  { type: "TEXT", text: "Hello world" },
  { type: "FILE", fileUrl: "https://files.example.com/a.pdf" },
  { type: "MANAGED_FILE", key: "namespaces/ns_1/a.pdf" },
  { type: "BATCH", items: [{ type: "TEXT", text: "Hello world" }] },
];

describe("ingest job payload input on us", () => {
  it("accepts crawl and youtube payloads", async () => {
    const { ingestJobPayloadInputSchema } = await loadValidation(undefined);

    expect(ingestJobPayloadInputSchema.safeParse(crawlPayload).success).toBe(
      true,
    );
    expect(ingestJobPayloadInputSchema.safeParse(youtubePayload).success).toBe(
      true,
    );
  });

  it("uses the unchanged crawl and youtube schemas", async () => {
    const validation = await loadValidation("us");

    expect(validation.crawlPayloadInputSchema).toBe(
      validation.crawlPayloadSchema,
    );
    expect(validation.youtubePayloadInputSchema).toBe(
      validation.youtubePayloadSchema,
    );
  });

  it("accepts crawl payloads when creating ingest jobs", async () => {
    const schema = await loadCreateIngestJobSchema("us");

    expect(schema.safeParse({ payload: crawlPayload }).success).toBe(true);
  });
});

describe("ingest job payload input on eu", () => {
  it.each([
    ["crawl", crawlPayload, "Crawl ingestion is not available in this region."],
    [
      "youtube",
      youtubePayload,
      "YouTube ingestion is not available in this region.",
    ],
  ])("rejects %s payloads", async (_label, payload, message) => {
    const { ingestJobPayloadInputSchema } = await loadValidation("eu");

    const result = ingestJobPayloadInputSchema.safeParse(payload);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      code: "custom",
      path: ["type"],
      message,
    });
  });

  it("reports the region error before field errors", async () => {
    const { ingestJobPayloadInputSchema } = await loadValidation("eu");

    const result = ingestJobPayloadInputSchema.safeParse({
      type: "CRAWL",
      url: "not a url",
    });

    expect(result.error?.issues[0]?.message).toBe(
      "Crawl ingestion is not available in this region.",
    );
  });

  it.each(availablePayloads)("accepts $type payloads", async (payload) => {
    const { ingestJobPayloadInputSchema } = await loadValidation("eu");

    expect(ingestJobPayloadInputSchema.safeParse(payload).success).toBe(true);
  });

  it("still reads stored crawl and youtube payloads", async () => {
    const { ingestJobPayloadSchema } = await loadValidation("eu");

    expect(ingestJobPayloadSchema.safeParse(crawlPayload).success).toBe(true);
    expect(ingestJobPayloadSchema.safeParse(youtubePayload).success).toBe(true);
  });

  it("rejects crawl payloads when creating ingest jobs", async () => {
    const schema = await loadCreateIngestJobSchema("eu");

    const result = schema.safeParse({ payload: crawlPayload });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ["payload", "type"],
      message: "Crawl ingestion is not available in this region.",
    });
    expect(
      schema.safeParse({ payload: { type: "TEXT", text: "Hello world" } })
        .success,
    ).toBe(true);
  });
});
