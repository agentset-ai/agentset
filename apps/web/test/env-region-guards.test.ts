import { afterEach, describe, expect, it, vi } from "vitest";

type EnvValues = Record<string, string | undefined>;

// Every variable the env modules or EU checks read, so ambient values can't affect results.
const BASE_ENV: EnvValues = {
  // the stripe env schema doesn't accept vitest's "test"
  NODE_ENV: "development",
  CI: undefined,
  npm_lifecycle_event: undefined,
  SKIP_ENV_VALIDATION: undefined,
  VERCEL: undefined,
  NEXT_PUBLIC_VERCEL_ENV: undefined,
  NEXT_PUBLIC_DEPLOYMENT_REGION: undefined,

  // engine
  DEFAULT_PINECONE_API_KEY: undefined,
  DEFAULT_PINECONE_HOST: undefined,
  SECONDARY_PINECONE_API_KEY: undefined,
  SECONDARY_PINECONE_HOST: undefined,
  DEFAULT_TURBOPUFFER_API_KEY: undefined,
  DEFAULT_ZEROENTROPY_API_KEY: undefined,
  DEFAULT_AZURE_RESOURCE_NAME: "azure-resource",
  DEFAULT_AZURE_API_KEY: "azure-key",
  DEFAULT_COHERE_API_KEY: "cohere-key",
  DEFAULT_COHERE_BASE_URL: undefined,
  PARTITION_API_KEY: "partition-key",
  PARTITION_API_URL: "https://partition.example.com",
  TURBOPUFFER_BASE_URL: undefined,
  TURBOPUFFER_REGION: undefined,
  ZEROENTROPY_BASE_URL: undefined,
  CO_API_KEY: undefined,
  AZURE_RESOURCE_NAME: undefined,
  AZURE_API_KEY: undefined,

  // storage
  S3_ACCESS_KEY: "s3-access",
  S3_SECRET_KEY: "s3-secret",
  S3_ENDPOINT: "https://account.r2.cloudflarestorage.com",
  S3_BUCKET: "uploads",
  ASSETS_S3_BUCKET: "assets",
  ASSETS_S3_URL: "https://assets.example.com",
  IMAGES_S3_BUCKET: "images",

  // stripe + emails
  STRIPE_API_KEY: "sk_test_123",
  NEXT_PUBLIC_STRIPE_PUBLIC_KEY: "pk_test_123",
  RESEND_API_KEY: "re_123",
  APP_DOMAIN: undefined,

  // web
  NEXT_PUBLIC_APP_HOSTNAME: undefined,
  NEXT_PUBLIC_API_HOSTNAME: undefined,
  NEXT_PUBLIC_HOSTING_CNAME: undefined,
  NEXT_PUBLIC_POSTHOG_KEY: undefined,
  DATABASE_URL: "postgresql://postgres:password@localhost:5432/agentset",
  BETTER_AUTH_SECRET: "auth-secret",
  BETTER_AUTH_URL: "http://localhost:3000",
  GITHUB_CLIENT_ID: "github-id",
  GITHUB_CLIENT_SECRET: "github-secret",
  GOOGLE_CLIENT_ID: "google-id",
  GOOGLE_CLIENT_SECRET: "google-secret",
  REDIS_URL: "https://redis.example.com",
  REDIS_TOKEN: "redis-token",
  STRIPE_WEBHOOK_SECRET: "whsec_123",
  TRIGGER_SECRET_KEY: "tr_dev_123",
  VERCEL_PROJECT_ID: "prj_123",
  VERCEL_TEAM_ID: "team_123",
  VERCEL_API_TOKEN: "vercel-token",
  TINYBIRD_API_KEY: undefined,
  TINYBIRD_API_URL: undefined,
};

const US_ENV: EnvValues = {
  ...BASE_ENV,
  DEFAULT_PINECONE_API_KEY: "pinecone-key",
  DEFAULT_PINECONE_HOST: "https://index.pinecone.example.com",
  SECONDARY_PINECONE_API_KEY: "pinecone-key-2",
  SECONDARY_PINECONE_HOST: "https://index-2.pinecone.example.com",
  DEFAULT_TURBOPUFFER_API_KEY: "tpuf-key",
  DEFAULT_ZEROENTROPY_API_KEY: "ze-key",
  TINYBIRD_API_KEY: "tb-key",
  TINYBIRD_API_URL: "https://api.tinybird.example.com",
  NEXT_PUBLIC_POSTHOG_KEY: "phc_123",
};

const EU_ENV: EnvValues = {
  ...BASE_ENV,
  NEXT_PUBLIC_DEPLOYMENT_REGION: "eu",
  DEFAULT_COHERE_BASE_URL:
    "https://eu-resource.services.ai.azure.com/providers/cohere",
  S3_ENDPOINT: "https://account.eu.r2.cloudflarestorage.com",
  APP_DOMAIN: "https://eu.agentset.ai",
  NEXT_PUBLIC_APP_HOSTNAME: "eu.agentset.ai",
  NEXT_PUBLIC_API_HOSTNAME: "api.eu.agentset.ai",
  NEXT_PUBLIC_HOSTING_CNAME: "cname.eu.agentset.ai",
  DATABASE_URL:
    "postgresql://user:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres",
  BETTER_AUTH_URL: "https://eu.agentset.ai",
  GOOGLE_CLIENT_ID: undefined,
  GOOGLE_CLIENT_SECRET: undefined,
  REDIS_URL: "https://eu-db.upstash.io",
};

const stubEnv = (values: EnvValues) => {
  vi.resetModules();
  for (const [name, value] of Object.entries(values)) {
    vi.stubEnv(name, value);
  }
};

const importError = (load: () => Promise<unknown>) =>
  load().then(
    () => undefined,
    (error: unknown) => error as Error,
  );

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("engine env", () => {
  it("loads on us with the managed keys set", async () => {
    stubEnv(US_ENV);
    const { env } = await import("@agentset/engine/env");

    expect(env.DEFAULT_PINECONE_API_KEY).toBe("pinecone-key");
    expect(env.DEFAULT_COHERE_BASE_URL).toBeUndefined();
  });

  it("loads on us without the now-optional keys", async () => {
    stubEnv(BASE_ENV);
    const { env } = await import("@agentset/engine/env");

    expect(env.DEFAULT_TURBOPUFFER_API_KEY).toBeUndefined();
  });

  it("loads a valid eu config", async () => {
    stubEnv(EU_ENV);
    const { env } = await import("@agentset/engine/env");

    expect(env.DEFAULT_COHERE_BASE_URL).toBe(EU_ENV.DEFAULT_COHERE_BASE_URL);
  });

  it("fails on eu when a managed key is set, naming only the variable", async () => {
    stubEnv({ ...EU_ENV, DEFAULT_TURBOPUFFER_API_KEY: "tpuf-secret-value" });
    const error = await importError(() => import("@agentset/engine/env"));

    expect(error?.message).toContain(
      "DEFAULT_TURBOPUFFER_API_KEY must not be set in the EU region",
    );
    expect(error?.message).not.toContain("tpuf-secret-value");
  });

  it("fails on eu without DEFAULT_COHERE_BASE_URL", async () => {
    stubEnv({ ...EU_ENV, DEFAULT_COHERE_BASE_URL: undefined });
    const error = await importError(() => import("@agentset/engine/env"));

    expect(error?.message).toContain(
      "DEFAULT_COHERE_BASE_URL is required in the EU region",
    );
  });

  it("skips the eu checks with SKIP_ENV_VALIDATION", async () => {
    stubEnv({
      ...EU_ENV,
      SKIP_ENV_VALIDATION: "1",
      DEFAULT_TURBOPUFFER_API_KEY: "tpuf-key",
    });

    await expect(import("@agentset/engine/env")).resolves.toBeDefined();
  });
});

describe("storage env", () => {
  it("accepts any endpoint on us", async () => {
    stubEnv(US_ENV);

    await expect(import("@agentset/storage/env")).resolves.toBeDefined();
  });

  it("requires an EU R2 endpoint on eu", async () => {
    stubEnv({ ...EU_ENV, S3_ENDPOINT: US_ENV.S3_ENDPOINT });
    const error = await importError(() => import("@agentset/storage/env"));

    expect(error?.message).toContain(
      "S3_ENDPOINT must be an EU jurisdiction R2 endpoint",
    );
  });

  it("loads a valid eu config", async () => {
    stubEnv(EU_ENV);

    await expect(import("@agentset/storage/env")).resolves.toBeDefined();
  });
});

describe("web env", () => {
  it("loads on us with defaults", async () => {
    stubEnv(US_ENV);
    const { env } = await import("@/env");

    expect(env.NEXT_PUBLIC_DEPLOYMENT_REGION).toBe("us");
    expect(env.NEXT_PUBLIC_APP_HOSTNAME).toBeUndefined();
    expect(env.GOOGLE_CLIENT_ID).toBe("google-id");
  });

  it("loads on us without Google credentials", async () => {
    stubEnv({
      ...US_ENV,
      GOOGLE_CLIENT_ID: undefined,
      GOOGLE_CLIENT_SECRET: undefined,
    });

    await expect(import("@/env")).resolves.toBeDefined();
  });

  it("loads a valid eu config", async () => {
    stubEnv(EU_ENV);
    const { env } = await import("@/env");

    expect(env.NEXT_PUBLIC_DEPLOYMENT_REGION).toBe("eu");
    expect(env.NEXT_PUBLIC_APP_HOSTNAME).toBe("eu.agentset.ai");
  });

  it("lists every eu web issue at once", async () => {
    stubEnv({
      ...EU_ENV,
      NEXT_PUBLIC_API_HOSTNAME: undefined,
      GOOGLE_CLIENT_ID: "google-id",
      TINYBIRD_API_KEY: "tb-key",
      BETTER_AUTH_URL: "https://app.agentset.ai",
      DATABASE_URL: BASE_ENV.DATABASE_URL,
    });
    const error = await importError(() => import("@/env"));

    expect(error?.message).toBe(
      [
        "Invalid EU region configuration:",
        "  - NEXT_PUBLIC_API_HOSTNAME is required in the EU region",
        "  - GOOGLE_CLIENT_ID must not be set in the EU region",
        "  - TINYBIRD_API_KEY must not be set in the EU region",
        "  - DATABASE_URL must point to an EU database host",
        "  - BETTER_AUTH_URL must use the NEXT_PUBLIC_APP_HOSTNAME host",
      ].join("\n"),
    );
  });

  it("skips the eu checks in CI", async () => {
    stubEnv({ ...EU_ENV, CI: "1", GOOGLE_CLIENT_ID: "google-id" });

    await expect(import("@/env")).resolves.toBeDefined();
  });

  it("rejects an unknown region", async () => {
    stubEnv({ ...US_ENV, NEXT_PUBLIC_DEPLOYMENT_REGION: "EU" });
    const error = await importError(() => import("@/env"));

    expect(error).toBeInstanceOf(Error);
  });
});
