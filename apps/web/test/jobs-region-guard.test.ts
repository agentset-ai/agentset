import { afterEach, describe, expect, it, vi } from "vitest";

type EnvValues = Record<string, string | undefined>;

// Every variable the jobs EU checks read, so ambient values can't leak in
const EU_ENV: EnvValues = {
  DATABASE_URL:
    "postgresql://user:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres",
  S3_ENDPOINT: "https://account.eu.r2.cloudflarestorage.com",
  DEFAULT_COHERE_BASE_URL:
    "https://resource.services.ai.azure.com/providers/cohere",
  DEFAULT_AZURE_RESOURCE_NAME: "eu-resource",
  PARTITION_API_URL: "https://partition-eu.example.com",
  REDIS_URL: "https://eu-redis.example.com",
  APP_DOMAIN: "https://eu.agentset.ai",
  DEFAULT_PINECONE_API_KEY: undefined,
  DEFAULT_PINECONE_HOST: undefined,
  SECONDARY_PINECONE_API_KEY: undefined,
  SECONDARY_PINECONE_HOST: undefined,
  DEFAULT_TURBOPUFFER_API_KEY: undefined,
  DEFAULT_ZEROENTROPY_API_KEY: undefined,
  TURBOPUFFER_BASE_URL: undefined,
  TURBOPUFFER_REGION: undefined,
  ZEROENTROPY_BASE_URL: undefined,
  CO_API_KEY: undefined,
  AZURE_RESOURCE_NAME: undefined,
  AZURE_API_KEY: undefined,
  TINYBIRD_API_KEY: undefined,
  TINYBIRD_API_URL: undefined,
};

const US_LIKE_ENV: EnvValues = {
  ...EU_ENV,
  DATABASE_URL: "postgresql://user:password@db.example.com:5432/postgres",
  S3_ENDPOINT: "https://account.r2.cloudflarestorage.com",
  DEFAULT_COHERE_BASE_URL: undefined,
  DEFAULT_TURBOPUFFER_API_KEY: "tpuf-key",
  TINYBIRD_API_KEY: "tb-key",
  APP_DOMAIN: undefined,
};

const importGuard = async (region: "us" | "eu", env: EnvValues) => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  return import("../../../packages/jobs/src/region-guard");
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("jobs EU config guard", () => {
  it("accepts an EU configuration", async () => {
    const { assertJobsEuConfig, getJobsEuConfigIssues } = await importGuard(
      "eu",
      EU_ENV,
    );

    expect(getJobsEuConfigIssues(EU_ENV)).toEqual([]);
    expect(() => assertJobsEuConfig()).not.toThrow();
  });

  it("names every misconfigured variable without its value", async () => {
    const { getJobsEuConfigIssues } = await importGuard("eu", EU_ENV);

    const issues = getJobsEuConfigIssues(US_LIKE_ENV);

    expect(issues).toEqual([
      "DATABASE_URL must point to an EU database host",
      "S3_ENDPOINT must be an EU jurisdiction R2 endpoint (*.eu.r2.cloudflarestorage.com)",
      "DEFAULT_COHERE_BASE_URL is required in the EU region",
      "DEFAULT_TURBOPUFFER_API_KEY must not be set in the EU region",
      "TINYBIRD_API_KEY must not be set in the EU region",
      "APP_DOMAIN is required in the EU region",
    ]);
    expect(issues.join("\n")).not.toMatch(/example\.com|tpuf-key|tb-key/);
  });

  it("fails the run on eu", async () => {
    const { assertJobsEuConfig } = await importGuard("eu", US_LIKE_ENV);

    expect(() => assertJobsEuConfig()).toThrow(
      /^Invalid EU region configuration:\n {2}- DATABASE_URL/,
    );
  });

  it("does nothing on us", async () => {
    const { assertJobsEuConfig } = await importGuard("us", US_LIKE_ENV);

    expect(() => assertJobsEuConfig()).not.toThrow();
  });
});

describe("jobs run region guard", () => {
  it.each<[string | undefined, string]>([
    [undefined, "PRODUCTION"],
    ["us-east-1", "PRODUCTION"],
    ["us-east-1", "DEVELOPMENT"],
    ["eu-central-1", "PRODUCTION"],
  ])("does nothing on us (%s, %s)", async (region, environmentType) => {
    const { assertJobsRunRegion } = await importGuard("us", US_LIKE_ENV);

    expect(() =>
      assertJobsRunRegion({ region, environmentType }),
    ).not.toThrow();
  });

  it("lets eu runs on eu workers and dev runs through", async () => {
    const { assertJobsRunRegion } = await importGuard("eu", EU_ENV);

    expect(() =>
      assertJobsRunRegion({
        region: "eu-central-1",
        environmentType: "PRODUCTION",
      }),
    ).not.toThrow();
    expect(() =>
      assertJobsRunRegion({
        region: "eu-central-1:scheduled",
        environmentType: "PRODUCTION",
      }),
    ).not.toThrow();
    expect(() =>
      assertJobsRunRegion({
        region: undefined,
        environmentType: "DEVELOPMENT",
      }),
    ).not.toThrow();
  });

  it.each([undefined, "us-east-1", "us-east-1:scheduled"])(
    "fails deployed eu runs in %s",
    async (region) => {
      const { assertJobsRunRegion } = await importGuard("eu", EU_ENV);

      for (const environmentType of ["PRODUCTION", "STAGING", "PREVIEW"]) {
        expect(() => assertJobsRunRegion({ region, environmentType })).toThrow(
          "EU runs must execute in eu-central-1",
        );
      }
    },
  );
});
