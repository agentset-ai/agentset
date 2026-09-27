import { afterEach, describe, expect, it, vi } from "vitest";

type Region = "us" | "eu";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const setup = (
  region: Region,
  { posthogKey }: { posthogKey?: string } = { posthogKey: "phc_test" },
) => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);
  vi.doMock("@/env", () => ({
    env: { NEXT_PUBLIC_POSTHOG_KEY: posthogKey },
  }));

  const posthog = {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
  };
  const loadPosthogJs = vi.fn(() => ({ default: posthog }));
  vi.doMock("posthog-js", loadPosthogJs);

  const posthogNode = {
    constructed: vi.fn(),
    capture: vi.fn(),
    groupIdentify: vi.fn(),
  };
  vi.doMock("posthog-node", () => ({
    PostHog: class {
      constructor(...args: unknown[]) {
        posthogNode.constructed(...args);
      }
      capture = posthogNode.capture;
      groupIdentify = posthogNode.groupIdentify;
      shutdown = () => Promise.resolve();
    },
  }));

  return { posthog, loadPosthogJs, posthogNode };
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("@/env");
  vi.doUnmock("posthog-js");
  vi.doUnmock("posthog-node");
  vi.doUnmock("jiti");
});

describe("browser analytics", () => {
  it("initialises PostHog before capturing events on us", async () => {
    const { posthog } = setup("us");

    await import("@/instrumentation-client");
    const { logEvent } = await import("@/lib/analytics");
    logEvent("event_name", { id: "1" }, { sendInstantly: true });
    await vi.waitFor(() => expect(posthog.capture).toHaveBeenCalled());

    expect(posthog.init).toHaveBeenCalledWith("phc_test", {
      defaults: "2025-05-24",
      api_host: "/_proxy/posthog/ingest",
      ui_host: "https://us.posthog.com",
    });
    expect(posthog.capture).toHaveBeenCalledWith(
      "event_name",
      { id: "1" },
      { send_instantly: true },
    );
    expect(posthog.init.mock.invocationCallOrder[0]).toBeLessThan(
      posthog.capture.mock.invocationCallOrder[0]!,
    );
  });

  it("captures events without a key on us, as before", async () => {
    const { posthog } = setup("us", {});

    await import("@/instrumentation-client");
    const { logEvent } = await import("@/lib/analytics");
    logEvent("event_name");
    await vi.waitFor(() => expect(posthog.capture).toHaveBeenCalled());

    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).toHaveBeenCalledWith("event_name", undefined, {
      send_instantly: undefined,
    });
  });

  it("never loads posthog-js on eu", async () => {
    const { posthog, loadPosthogJs } = setup("eu");

    await import("@/instrumentation-client");
    const { loadPosthog, logEvent } = await import("@/lib/analytics");
    logEvent("event_name", { id: "1" });
    await flush();

    expect(loadPosthog()).toBeUndefined();
    expect(loadPosthogJs).not.toHaveBeenCalled();
    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
  });
});

describe("server analytics", () => {
  const organization = { id: "org_1", name: "Acme", plan: "pro" };

  it("sends events on us", async () => {
    const { posthogNode } = setup("us");

    const { logServerEvent, identifyOrganization } =
      await import("@/lib/analytics-server");
    logServerEvent("api_call", { organization, routeName: "search" });
    identifyOrganization(organization);

    expect(posthogNode.constructed).toHaveBeenCalledWith("phc_test", {
      host: "https://us.i.posthog.com",
    });
    expect(posthogNode.capture).toHaveBeenCalledOnce();
    expect(posthogNode.groupIdentify).toHaveBeenCalledOnce();
  });

  it("is a no-op on eu even if a key is present", async () => {
    const { posthogNode } = setup("eu");

    const { logServerEvent, identifyOrganization, flushServerEvents } =
      await import("@/lib/analytics-server");
    logServerEvent("api_call", { organization, routeName: "search" });
    identifyOrganization(organization);

    expect(flushServerEvents()).toBeUndefined();
    expect(posthogNode.constructed).not.toHaveBeenCalled();
    expect(posthogNode.capture).not.toHaveBeenCalled();
    expect(posthogNode.groupIdentify).not.toHaveBeenCalled();
  });
});

describe("PostHog proxy rewrites", () => {
  const loadRewrites = async (region: Region) => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);
    vi.doMock("jiti", () => ({
      createJiti: () => ({
        import: (id: string) =>
          id === "@agentset/utils" ? import("@agentset/utils") : {},
      }),
    }));

    const { default: config } = await import("../next.config");
    return (await config).rewrites!();
  };

  it("proxies PostHog on us", async () => {
    expect(await loadRewrites("us")).toEqual([
      {
        source: "/_proxy/posthog/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/_proxy/posthog/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ]);
  });

  it("has no PostHog proxy on eu", async () => {
    expect(await loadRewrites("eu")).toEqual([]);
  });
});
