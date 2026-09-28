import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

type Region = "us" | "eu" | undefined;

const US_KEY = "agentset_AbCdEfGhIjKlMnOp";
const EU_KEY = "agentset_eu_AbCdEfGhIjKlMnOp";

const importKeyRegion = async (region: Region) => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);
  return import("@/lib/api/api-key-region");
};

const loadHandler = async (region: Region) => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);

  const getApiKeyInfo = vi.fn((key: string) =>
    Promise.resolve(
      key === US_KEY || key === EU_KEY
        ? {
            scope: "all",
            organizationId: "org_1",
            organization: { name: "Org", plan: "pro", apiRatelimit: 100 },
          }
        : null,
    ),
  );
  const limit = vi.fn(() =>
    Promise.resolve({ success: true, limit: 100, reset: 0, remaining: 99 }),
  );

  vi.doMock("@/env", () => ({ env: { NODE_ENV: "development" } }));
  vi.doMock("@/lib/api/api-key", () => ({ getApiKeyInfo }));
  vi.doMock("@/lib/api/rate-limit", () => ({ ratelimit: () => ({ limit }) }));
  vi.doMock("@/lib/api/tenant", () => ({
    getTenantFromRequest: () => undefined,
  }));
  vi.doMock("@/lib/analytics-server", () => ({
    flushServerEvents: vi.fn(),
    identifyOrganization: vi.fn(),
    logServerEvent: vi.fn(),
  }));

  const { withApiHandler } = await import("@/lib/api/handler/base");
  return { withApiHandler, getApiKeyInfo };
};

const request = (apiKey: string) =>
  new NextRequest("https://api.example.com/v1/namespace", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

const call = async (
  handler: ReturnType<
    Awaited<ReturnType<typeof loadHandler>>["withApiHandler"]
  >,
  apiKey: string,
) => {
  const res = await handler(request(apiKey), {
    params: Promise.resolve({}),
  });
  return {
    status: res.status,
    body: (await res.json()) as {
      success?: boolean;
      error?: { code: string; message: string };
    },
  };
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.doUnmock("@/env");
  vi.doUnmock("@/lib/api/api-key");
  vi.doUnmock("@/lib/api/rate-limit");
  vi.doUnmock("@/lib/api/tenant");
  vi.doUnmock("@/lib/analytics-server");
  vi.doUnmock("@agentset/db/client");
  vi.doUnmock("next/cache");
});

describe("API key prefix", () => {
  it.each<[Region, string]>([
    [undefined, "agentset_"],
    ["us", "agentset_"],
    ["eu", "agentset_eu_"],
  ])("uses the %s prefix", async (region, prefix) => {
    const { API_KEY_PREFIX } = await importKeyRegion(region);

    expect(API_KEY_PREFIX).toBe(prefix);
  });

  it.each<[Region, string]>([
    ["us", "agentset_"],
    ["eu", "agentset_eu_"],
  ])("creates %s keys with the region prefix", async (region, prefix) => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);
    const create = vi.fn(({ data }: { data: { key: string } }) =>
      Promise.resolve({ id: "key_1", ...data }),
    );
    vi.doMock("@agentset/db/client", () => ({
      db: { organizationApiKey: { create } },
    }));
    vi.doMock("next/cache", () => ({ revalidateTag: vi.fn() }));

    const { createApiKey } = await import("@/services/api-key/create");
    const apiKey = await createApiKey({
      organizationId: "org_1",
      label: "Default API Key",
      scope: "all",
    });

    expect(apiKey.key.startsWith(prefix)).toBe(true);
    expect(apiKey.key).toMatch(new RegExp(`^${prefix}[A-Za-z]{16}$`));
  });
});

describe("getApiKeyRegionError", () => {
  it("accepts us keys and rejects eu keys on us", async () => {
    const { getApiKeyRegionError } = await importKeyRegion("us");

    expect(getApiKeyRegionError(US_KEY)).toBeNull();
    expect(getApiKeyRegionError("not-a-prefixed-key")).toBeNull();
    expect(getApiKeyRegionError(EU_KEY)).toBe(
      "This API key belongs to the EU region; use https://api.eu.agentset.ai",
    );
  });

  it("accepts eu keys and rejects us keys on eu", async () => {
    const { getApiKeyRegionError } = await importKeyRegion("eu");

    expect(getApiKeyRegionError(EU_KEY)).toBeNull();
    expect(getApiKeyRegionError("not-a-prefixed-key")).toBeNull();
    expect(getApiKeyRegionError(US_KEY)).toBe(
      "This API key belongs to the US region; use https://api.agentset.ai",
    );
  });
});

describe("withApiHandler", () => {
  it.each<[Region, string]>([
    ["us", US_KEY],
    ["eu", EU_KEY],
  ])("authenticates own-region keys on %s", async (region, apiKey) => {
    const { withApiHandler, getApiKeyInfo } = await loadHandler(region);
    const handler = withApiHandler(
      ({ organization }) =>
        Promise.resolve(Response.json({ organizationId: organization.id })),
      { logging: false },
    );

    const res = await handler(request(apiKey), {
      params: Promise.resolve({}),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ organizationId: "org_1" });
    expect(getApiKeyInfo).toHaveBeenCalledWith(apiKey);
  });

  it.each<[Region, string, string]>([
    [
      "us",
      EU_KEY,
      "This API key belongs to the EU region; use https://api.eu.agentset.ai",
    ],
    [
      "eu",
      US_KEY,
      "This API key belongs to the US region; use https://api.agentset.ai",
    ],
  ])(
    "rejects the other region's keys on %s with a 401",
    async (region, apiKey, message) => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      const { withApiHandler, getApiKeyInfo } = await loadHandler(region);
      const inner = vi.fn(() => Promise.resolve(Response.json({})));
      const handler = withApiHandler(inner, { logging: false });

      const { status, body } = await call(handler, apiKey);

      expect(status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error).toMatchObject({ code: "unauthorized", message });
      expect(getApiKeyInfo).not.toHaveBeenCalled();
      expect(inner).not.toHaveBeenCalled();
    },
  );

  it("keeps the us response for unknown keys", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { withApiHandler } = await loadHandler("us");
    const handler = withApiHandler(() => Promise.resolve(Response.json({})), {
      logging: false,
    });

    const { status, body } = await call(handler, "agentset_unknown");

    expect(status).toBe(401);
    expect(body.error?.message).toBe("Unauthorized: Invalid API key.");
  });

  it("logs handler errors as today on us", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { withApiHandler } = await loadHandler("us");
    const error = new Error("prompt text");
    const handler = withApiHandler(() => Promise.reject(error), {
      logging: { routeName: "POST /v1/namespace/[namespaceId]/search" },
    });

    const { status } = await call(handler, US_KEY);

    expect(status).toBe(500);
    expect(consoleError).toHaveBeenNthCalledWith(1, error);
    expect(consoleError).toHaveBeenNthCalledWith(
      2,
      "API error occurred",
      "prompt text",
    );
  });

  it("logs only the error type and ids on eu", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { withApiHandler } = await loadHandler("eu");
    const handler = withApiHandler(
      () => Promise.reject(new TypeError("prompt text")),
      { logging: { routeName: "POST /v1/namespace/[namespaceId]/search" } },
    );

    const { status } = await call(handler, EU_KEY);

    expect(status).toBe(500);
    expect(consoleError).toHaveBeenNthCalledWith(1, "API request failed", {
      error: { name: "TypeError" },
      context: {
        organizationId: "org_1",
        routeName: "POST /v1/namespace/[namespaceId]/search",
      },
    });
    expect(consoleError).toHaveBeenNthCalledWith(2, "API error occurred", {
      error: { name: "TypeError" },
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "prompt text",
    );
  });
});
