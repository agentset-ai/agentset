import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

type WebEnv = {
  NEXT_PUBLIC_APP_NAME: string;
  NEXT_PUBLIC_APP_SHORT_DOMAIN: string;
  NEXT_PUBLIC_VERCEL_ENV: "development" | "preview" | "production";
  NEXT_PUBLIC_APP_HOSTNAME?: string;
  NEXT_PUBLIC_API_HOSTNAME?: string;
  NEXT_PUBLIC_HOSTING_CNAME?: string;
};

type Scenario = {
  region: "us" | "eu";
  env: Partial<WebEnv>;
  port?: string;
};

const EU_HOSTNAMES = {
  NEXT_PUBLIC_APP_HOSTNAME: "eu.agentset.ai",
  NEXT_PUBLIC_API_HOSTNAME: "api.eu.agentset.ai",
  NEXT_PUBLIC_HOSTING_CNAME: "cname.eu.agentset.ai",
};

const load = async ({ region, env, port }: Scenario) => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);
  vi.stubEnv("PORT", port);
  vi.doMock("@/env", () => ({
    env: {
      NEXT_PUBLIC_APP_NAME: "Agentset",
      NEXT_PUBLIC_APP_SHORT_DOMAIN: "agentset.ai",
      NEXT_PUBLIC_VERCEL_ENV: "development",
      ...env,
    },
  }));

  return {
    constants: await import("@/lib/constants"),
    middleware: await import("@/lib/middleware/utils"),
  };
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("@/env");
  vi.doUnmock("next/headers");
});

describe("hostname constants", () => {
  it.each<[string, Scenario, Record<string, unknown>]>([
    [
      "us production",
      { region: "us", env: { NEXT_PUBLIC_VERCEL_ENV: "production" } },
      {
        APP_HOSTNAME: "app.agentset.ai",
        APP_DOMAIN: "https://app.agentset.ai",
        API_HOSTNAME: "api.agentset.ai",
        API_DOMAIN: "https://api.agentset.ai",
        HOSTING_CNAME: "cname.agentset.ai",
      },
    ],
    [
      "us preview",
      { region: "us", env: { NEXT_PUBLIC_VERCEL_ENV: "preview" } },
      {
        APP_HOSTNAME: "staging.agentset.ai",
        APP_DOMAIN: "https://staging.agentset.ai",
        API_HOSTNAME: "api-staging.agentset.ai",
        API_DOMAIN: "https://api-staging.agentset.ai",
        HOSTING_CNAME: "cname.agentset.ai",
      },
    ],
    [
      "us development",
      { region: "us", env: {} },
      {
        APP_HOSTNAME: "localhost:3000",
        APP_DOMAIN: "http://localhost:3000",
        API_HOSTNAME: "api.localhost:3000",
        API_DOMAIN: "http://api.localhost:3000",
        HOSTING_CNAME: "cname.agentset.ai",
      },
    ],
    [
      "us development on a custom port",
      { region: "us", env: {}, port: "4000" },
      {
        APP_DOMAIN: "http://localhost:4000",
        API_DOMAIN: "http://api.localhost:4000",
      },
    ],
    [
      "us with a custom short domain",
      {
        region: "us",
        env: {
          NEXT_PUBLIC_VERCEL_ENV: "production",
          NEXT_PUBLIC_APP_SHORT_DOMAIN: "acme.org",
        },
      },
      {
        APP_DOMAIN: "https://app.acme.org",
        API_DOMAIN: "https://api.acme.org",
        HOSTING_CNAME: "cname.acme.org",
      },
    ],
    [
      "eu production",
      {
        region: "eu",
        env: { NEXT_PUBLIC_VERCEL_ENV: "production", ...EU_HOSTNAMES },
      },
      {
        APP_HOSTNAME: "eu.agentset.ai",
        APP_DOMAIN: "https://eu.agentset.ai",
        API_HOSTNAME: "api.eu.agentset.ai",
        API_DOMAIN: "https://api.eu.agentset.ai",
        HOSTING_CNAME: "cname.eu.agentset.ai",
      },
    ],
  ])("resolves %s", async (_label, scenario, expected) => {
    const { constants } = await load(scenario);

    expect(constants).toMatchObject(expected);
  });

  it.each(["production", "preview", "development"] as const)(
    "keeps the us host sets unchanged (%s)",
    async (vercelEnv) => {
      const { constants } = await load({
        region: "us",
        env: { NEXT_PUBLIC_VERCEL_ENV: vercelEnv },
      });

      expect([...constants.APP_HOSTNAMES]).toEqual([
        "app.agentset.ai",
        "staging.agentset.ai",
        "localhost:3000",
      ]);
      expect([...constants.API_HOSTNAMES]).toEqual([
        "api.agentset.ai",
        "api-staging.agentset.ai",
        "api.localhost:3000",
      ]);
    },
  );

  it("routes the eu hosts to the app and api", async () => {
    const { constants } = await load({
      region: "eu",
      env: { NEXT_PUBLIC_VERCEL_ENV: "production", ...EU_HOSTNAMES },
    });

    expect(constants.APP_HOSTNAMES.has("eu.agentset.ai")).toBe(true);
    expect(constants.API_HOSTNAMES.has("api.eu.agentset.ai")).toBe(true);
    expect(constants.APP_HOSTNAMES.has("api.eu.agentset.ai")).toBe(false);
    expect(constants.APP_HOSTNAMES.has("cname.eu.agentset.ai")).toBe(false);
    expect(constants.API_HOSTNAMES.has("cname.eu.agentset.ai")).toBe(false);
  });
});

describe("vercel.app hosts", () => {
  const request = (host: string) =>
    new NextRequest(`https://${host}/some/path?q=1`, { headers: { host } });

  it("maps to the short domain on us", async () => {
    const { middleware } = await load({
      region: "us",
      env: { NEXT_PUBLIC_VERCEL_ENV: "production" },
    });

    expect(middleware.parse(request("app-git-branch.vercel.app")).domain).toBe(
      "agentset.ai",
    );
    expect(middleware.parse(request("www.App.Agentset.ai")).domain).toBe(
      "app.agentset.ai",
    );
  });

  it("maps to the app hostname on eu", async () => {
    const { middleware } = await load({
      region: "eu",
      env: { NEXT_PUBLIC_VERCEL_ENV: "production", ...EU_HOSTNAMES },
    });

    expect(
      middleware.parse(request("app-eu-git-branch.vercel.app")).domain,
    ).toBe("eu.agentset.ai");
    expect(middleware.parse(request("api.eu.agentset.ai")).domain).toBe(
      "api.eu.agentset.ai",
    );
  });

  it.each<[Scenario, string]>([
    [
      { region: "us", env: { NEXT_PUBLIC_VERCEL_ENV: "production" } },
      "https://agentset.ai",
    ],
    [
      {
        region: "eu",
        env: { NEXT_PUBLIC_VERCEL_ENV: "production", ...EU_HOSTNAMES },
      },
      "https://eu.agentset.ai",
    ],
  ])("builds the sitemap url on %j", async (scenario, url) => {
    vi.doMock("next/headers", () => ({
      headers: () => Promise.resolve(new Headers({ host: "x.vercel.app" })),
    }));
    await load(scenario);
    const { default: sitemap } = await import("@/app/sitemap");

    const [entry] = await sitemap();
    expect(entry?.url).toBe(url);
  });
});
