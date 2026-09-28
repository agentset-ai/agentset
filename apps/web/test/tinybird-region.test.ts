import { afterEach, describe, expect, it, vi } from "vitest";

type Config = "key and url" | "key only" | "none";

const importTinybird = async (region: "us" | "eu", config: Config) => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);
  vi.stubEnv("TINYBIRD_API_KEY", config === "none" ? undefined : "tb-key");
  vi.stubEnv(
    "TINYBIRD_API_URL",
    config === "key and url" ? "https://tinybird.example.com" : undefined,
  );
  return import("@agentset/tinybird");
};

const mockIngestResponse = () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ successful_rows: 1, quarantined_rows: 0 }), {
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const EVENT = {
  event_id: "evt_1",
  webhook_id: "wh_1",
  task_id: "run_1",
  event: "document.ready" as const,
  url: "https://hooks.example.com/in",
  http_status: 200,
  request_body: "{}",
  response_body: "ok",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("isTinybirdEnabled", () => {
  it.each<["us" | "eu", Config, boolean]>([
    ["us", "key and url", true],
    ["us", "key only", true],
    ["us", "none", false],
    ["eu", "key and url", false],
    ["eu", "none", false],
  ])("on %s with %s is %s", async (region, config, expected) => {
    const { isTinybirdEnabled } = await importTinybird(region, config);

    expect(isTinybirdEnabled).toBe(expected);
  });
});

describe("delivery log calls", () => {
  it("never reach Tinybird on eu", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { recordWebhookEvent, getWebhookEvents } = await importTinybird(
      "eu",
      "key and url",
    );

    await expect(recordWebhookEvent(EVENT)).rejects.toThrow(
      "Webhook delivery logs are disabled",
    );
    await expect(getWebhookEvents({ webhookId: "wh_1" })).rejects.toThrow(
      "Webhook delivery logs are disabled",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each<[Config, string]>([
    ["key and url", "tinybird.example.com"],
    ["key only", "api.tinybird.co"],
  ])("send events on us with %s to %s", async (config, host) => {
    const fetchMock = mockIngestResponse();
    const { recordWebhookEvent } = await importTinybird("us", config);

    await recordWebhookEvent(EVENT);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url] = fetchMock.mock.calls[0] as [URL | string];
    expect(new URL(url).host).toBe(host);
  });
});
