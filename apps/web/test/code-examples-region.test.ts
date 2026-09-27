import { afterEach, describe, expect, it, vi } from "vitest";

type Region = "us" | "eu";

const loadExamples = async (
  region: Region,
  env: Record<string, string> = {},
) => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);
  vi.doMock("@/env", () => ({
    env: {
      NEXT_PUBLIC_APP_NAME: "Agentset",
      NEXT_PUBLIC_APP_SHORT_DOMAIN: "agentset.ai",
      NEXT_PUBLIC_VERCEL_ENV: "production",
      ...env,
    },
  }));

  return {
    ingest: await import("@/lib/code-examples/ingest"),
    playground: await import("@/lib/code-examples/playground"),
  };
};

const EU_ENV = {
  NEXT_PUBLIC_APP_HOSTNAME: "eu.agentset.ai",
  NEXT_PUBLIC_API_HOSTNAME: "api.eu.agentset.ai",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("@/env");
});

describe("code examples on us", () => {
  it.each<Record<string, string>>([
    {},
    { NEXT_PUBLIC_VERCEL_ENV: "preview" },
    { NEXT_PUBLIC_VERCEL_ENV: "development" },
  ])("keep today's snippets (%j)", async (env) => {
    const { ingest, playground } = await loadExamples("us", env);

    expect(playground.curlExample("agentset_key")).toContain(
      "--url https://api.agentset.ai/v1/namespace/{{namespace}}/search \\\n",
    );
    expect(ingest.curlExample()).toContain(
      "--url https://api.agentset.ai/v1/namespace/{{namespace}}/ingest-jobs \\\n",
    );
    expect(playground.tsSdkExample("agentset_key")).toContain(
      'const agentset = new Agentset({\n  apiKey: "agentset_key",\n});',
    );
    expect(playground.aiSdkExample()).toContain(
      'const agentset = new Agentset({\n  apiKey: "YOUR_API_KEY",\n});',
    );
    expect(ingest.tsSdkExample()).toContain(
      'const agentset = new Agentset({\n  apiKey: "YOUR_API_KEY",\n});',
    );
    for (const python of [playground.pythonExample(), ingest.pythonExample()]) {
      expect(python).toContain('    token="YOUR_API_KEY",\n)');
    }

    const all = [...Object.values(ingest), ...Object.values(playground)].map(
      (example) => example(),
    );
    for (const snippet of all) {
      expect(snippet).not.toContain("baseUrl");
      expect(snippet).not.toContain("server_url");
      expect(snippet).not.toContain("api.eu.");
    }
  });
});

describe("code examples on eu", () => {
  it("point curl at the EU API", async () => {
    const { ingest, playground } = await loadExamples("eu", EU_ENV);

    expect(playground.curlExample()).toContain(
      "--url https://api.eu.agentset.ai/v1/namespace/{{namespace}}/search \\\n",
    );
    expect(ingest.curlExample()).toContain(
      "--url https://api.eu.agentset.ai/v1/namespace/{{namespace}}/ingest-jobs \\\n",
    );
  });

  it("pass the EU API URL to the TypeScript SDK", async () => {
    const { ingest, playground } = await loadExamples("eu", EU_ENV);

    for (const snippet of [
      ingest.tsSdkExample("agentset_eu_key"),
      playground.tsSdkExample("agentset_eu_key"),
      playground.aiSdkExample("agentset_eu_key"),
    ]) {
      expect(snippet).toContain(
        'const agentset = new Agentset({\n  apiKey: "agentset_eu_key",\n  baseUrl: "https://api.eu.agentset.ai",\n});',
      );
    }
  });

  it("pass the EU API URL to the Python SDK", async () => {
    const { ingest, playground } = await loadExamples("eu", EU_ENV);

    for (const snippet of [
      ingest.pythonExample(),
      playground.pythonExample(),
    ]) {
      expect(snippet).toContain(
        '    token="YOUR_API_KEY",\n    server_url="https://api.eu.agentset.ai",\n)',
      );
    }
  });
});
