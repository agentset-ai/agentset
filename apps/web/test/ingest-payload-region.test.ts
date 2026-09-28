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

  it("uses the unchanged youtube schema", async () => {
    const validation = await loadValidation("us");

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
  it("rejects youtube payloads", async () => {
    const { ingestJobPayloadInputSchema } = await loadValidation("eu");

    const result = ingestJobPayloadInputSchema.safeParse(youtubePayload);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      code: "custom",
      path: ["type"],
      message: "YouTube ingestion is not available in this region.",
    });
  });

  it("reports the region error before field errors", async () => {
    const { ingestJobPayloadInputSchema } = await loadValidation("eu");

    const result = ingestJobPayloadInputSchema.safeParse({
      type: "YOUTUBE",
      urls: ["not a url"],
    });

    expect(result.error?.issues[0]?.message).toBe(
      "YouTube ingestion is not available in this region.",
    );
  });

  it.each([...availablePayloads, crawlPayload])(
    "accepts $type payloads",
    async (payload) => {
      const { ingestJobPayloadInputSchema } = await loadValidation("eu");

      expect(ingestJobPayloadInputSchema.safeParse(payload).success).toBe(true);
    },
  );

  it("still reads stored crawl and youtube payloads", async () => {
    const { ingestJobPayloadSchema } = await loadValidation("eu");

    expect(ingestJobPayloadSchema.safeParse(crawlPayload).success).toBe(true);
    expect(ingestJobPayloadSchema.safeParse(youtubePayload).success).toBe(true);
  });

  it("accepts crawl payloads when creating ingest jobs", async () => {
    const schema = await loadCreateIngestJobSchema("eu");

    expect(schema.safeParse({ payload: crawlPayload }).success).toBe(true);
  });
});
