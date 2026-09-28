import { afterEach, describe, expect, it, vi } from "vitest";

const importRegion = async (region: string | undefined) => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);
  return import("@agentset/utils");
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("deployment region", () => {
  it.each([
    ["unset", undefined],
    ["empty", ""],
    ["us", "us"],
  ])("defaults to us when %s", async (_label, value) => {
    const region = await importRegion(value);

    expect(region.DEPLOYMENT_REGION).toBe("us");
    expect(region.isEuRegion).toBe(false);
  });

  it("resolves eu", async () => {
    const region = await importRegion("eu");

    expect(region.DEPLOYMENT_REGION).toBe("eu");
    expect(region.isEuRegion).toBe(true);
  });

  it.each(["EU", "eu-central-1", "europe"])(
    "rejects unknown value %s without echoing it",
    async (value) => {
      const error = await importRegion(value).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain(
        "NEXT_PUBLIC_DEPLOYMENT_REGION",
      );
      expect((error as Error).message).not.toContain(value);
    },
  );
});

describe("REGION_FEATURES", () => {
  const FEATURES = [
    "googleSignIn",
    "productAnalytics",
    "webhookDeliveryLogs",
    "managedVectorStores",
    "zeroEntropyRerank",
    "youtubeIngestion",
    "demoTemplates",
    "usHostedEmbeddingProviders",
    "customerAzureEmbeddings",
    "thirdPartyBrowserAssets",
    "calEmbed",
  ];

  it("enables every feature on us", async () => {
    const { REGION_FEATURES } = await importRegion("us");

    expect(Object.keys(REGION_FEATURES).sort()).toEqual([...FEATURES].sort());
    expect(Object.values(REGION_FEATURES).every((v) => v === true)).toBe(true);
  });

  it("disables every feature on eu", async () => {
    const { REGION_FEATURES } = await importRegion("eu");

    expect(Object.keys(REGION_FEATURES).sort()).toEqual([...FEATURES].sort());
    expect(Object.values(REGION_FEATURES).every((v) => v === false)).toBe(true);
  });

  it("is frozen", async () => {
    const { REGION_FEATURES } = await importRegion("eu");

    expect(Object.isFrozen(REGION_FEATURES)).toBe(true);
  });
});

describe("EU allowlists", () => {
  it("exposes the same constants on both regions", async () => {
    const us = await importRegion("us");
    const eu = await importRegion("eu");

    for (const region of [us, eu]) {
      expect(region.EU_LLM_MODELS).toEqual([
        "openai:gpt-5.5",
        "openai:gpt-4.1",
        "openai:gpt-5-mini",
        "openai:gpt-5-nano",
      ]);
      expect(region.EU_RERANK_MODELS).toEqual([
        "cohere:rerank-v4.0-pro",
        "cohere:rerank-v4.0-fast",
      ]);
      expect(region.EU_TURBOPUFFER_REGIONS).toEqual([
        "aws-eu-central-1",
        "aws-eu-west-1",
        "gcp-europe-west3",
        "gcp-europe-west1",
      ]);
      expect(region.EU_VERCEL_REGIONS).toEqual([
        "fra1",
        "cdg1",
        "arn1",
        "dub1",
      ]);
      expect(region.EU_TRIGGER_REGION).toBe("eu-central-1");
    }
  });
});

describe("logError", () => {
  class ProviderError extends Error {
    constructor(
      message: string,
      readonly statusCode: number,
      readonly code: string,
      readonly responseBody: string,
    ) {
      super(message, { cause: new Error("chunk text in cause") });
      this.name = "ProviderError";
    }
  }

  const makeError = () =>
    new ProviderError(
      "request failed: prompt text",
      429,
      "rate_limited",
      '{"input":"chunk text"}',
    );

  it("logs exactly (message, error) on us", async () => {
    const { logError } = await importRegion(undefined);
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = makeError();

    logError("Rerank failed", error, { namespaceId: "ns_1" });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toHaveLength(2);
    expect(spy.mock.calls[0]![0]).toBe("Rerank failed");
    expect(spy.mock.calls[0]![1]).toBe(error);
  });

  it("logs only the error summary and context ids on eu", async () => {
    const { logError } = await importRegion("eu");
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logError("Rerank failed", makeError(), {
      namespaceId: "ns_1",
      organizationId: "org_1",
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toEqual([
      "Rerank failed",
      {
        error: { name: "ProviderError", code: "rate_limited", statusCode: 429 },
        context: { namespaceId: "ns_1", organizationId: "org_1" },
      },
    ]);

    const logged = JSON.stringify(spy.mock.calls[0]);
    expect(logged).not.toContain("prompt text");
    expect(logged).not.toContain("chunk text");
  });

  it("omits context when none is given on eu", async () => {
    const { logError } = await importRegion("eu");
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logError("Search failed", Object.assign(new Error("x"), { status: 503 }));

    expect(spy.mock.calls[0]).toEqual([
      "Search failed",
      { error: { name: "Error", status: 503 } },
    ]);
  });

  it.each([
    ["a string", "secret prompt", { name: "string" }],
    ["undefined", undefined, { name: "undefined" }],
    ["null", null, { name: "object" }],
    [
      "a plain object",
      { message: "chunk text", status: "bad", code: 7 },
      { name: "Object", code: 7 },
    ],
  ])(
    "summarizes %s without its content on eu",
    async (_label, thrown, expected) => {
      const { logError } = await importRegion("eu");
      const spy = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);

      logError("Failed", thrown);

      expect(spy.mock.calls[0]).toEqual(["Failed", { error: expected }]);
    },
  );
});

describe("canLoadImage", () => {
  const IMAGES = [
    "https://avatars.githubusercontent.com/u/1?v=4",
    "https://assets.eu.example.com/logos/org_1.png",
    "http://assets.eu.example.com/logos/org_1.png",
    "https://assets.eu.example.com.other.test/logo.png",
    "//cdn.example.com/logo.png",
    "/logo.png",
    "data:image/png;base64,AAAA",
    "blob:https://eu.agentset.ai/1234",
  ];

  it("loads any image on us", async () => {
    const { canLoadImage } = await importRegion("us");

    for (const src of IMAGES) expect(canLoadImage(src)).toBe(true);
    for (const src of ["", null, undefined]) {
      expect(canLoadImage(src)).toBe(false);
    }
  });

  it("loads only local and assets host images on eu", async () => {
    vi.stubEnv("NEXT_PUBLIC_ASSETS_HOSTNAME", "assets.eu.example.com");
    const { canLoadImage } = await importRegion("eu");

    expect(IMAGES.filter((src) => canLoadImage(src))).toEqual([
      "https://assets.eu.example.com/logos/org_1.png",
      "/logo.png",
      "data:image/png;base64,AAAA",
      "blob:https://eu.agentset.ai/1234",
    ]);
    expect(canLoadImage(null)).toBe(false);
  });

  it("loads no remote images on eu without an assets host", async () => {
    vi.stubEnv("NEXT_PUBLIC_ASSETS_HOSTNAME", undefined);
    const { canLoadImage } = await importRegion("eu");

    expect(canLoadImage("https://assets.eu.example.com/logo.png")).toBe(false);
    expect(canLoadImage("/logo.png")).toBe(true);
  });
});
