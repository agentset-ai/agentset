import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getEuDatabaseConfigIssues,
  getEuEngineConfigIssues,
  getEuRedisConfigIssues,
  getEuStorageConfigIssues,
  getEuWebConfigIssues,
  isAzureFoundryEndpoint,
  isUsOnlyHost,
  US_ONLY_HOST_SHA256,
} from "@agentset/utils/region-guard";

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

// Stand-ins for denylisted values: the real ones are only stored as hashes.
const DENYLISTED = {
  "us-only-azure": US_ONLY_HOST_SHA256[0]!,
  "us-only-redis.example.com": US_ONLY_HOST_SHA256[1]!,
  "us-only-partition.example.com": US_ONLY_HOST_SHA256[2]!,
} as Record<string, string>;

const mockDenylistedHashes = () => {
  const getBuiltinModule = process.getBuiltinModule.bind(process);
  vi.spyOn(process, "getBuiltinModule").mockImplementation(((id: string) => {
    if (id !== "node:crypto") return getBuiltinModule(id);
    return {
      createHash: () => {
        let input = "";
        const hash = {
          update: (value: string) => {
            input = value;
            return hash;
          },
          digest: () => DENYLISTED[input] ?? sha256(input),
        };
        return hash;
      },
    };
  }) as typeof process.getBuiltinModule);
};

const EU_ENGINE_ENV = {
  DEFAULT_AZURE_RESOURCE_NAME: "eu-resource",
  DEFAULT_AZURE_API_KEY: "azure-key",
  DEFAULT_COHERE_API_KEY: "cohere-key",
  DEFAULT_COHERE_BASE_URL:
    "https://eu-resource.services.ai.azure.com/providers/cohere",
  PARTITION_API_KEY: "partition-key",
  PARTITION_API_URL: "https://eu-partition.example.com",
};

const EU_WEB_ENV = {
  NEXT_PUBLIC_APP_HOSTNAME: "eu.agentset.ai",
  NEXT_PUBLIC_API_HOSTNAME: "api.eu.agentset.ai",
  NEXT_PUBLIC_HOSTING_CNAME: "cname.eu.agentset.ai",
  APP_DOMAIN: "https://eu.agentset.ai",
  BETTER_AUTH_URL: "https://eu.agentset.ai",
  DATABASE_URL:
    "postgresql://user:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres",
  REDIS_URL: "https://eu-db.upstash.io",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("isUsOnlyHost", () => {
  it("stores 64-char sha256 hex digests", () => {
    expect(US_ONLY_HOST_SHA256).toHaveLength(3);
    for (const hash of US_ONLY_HOST_SHA256) {
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("returns false for other hosts", () => {
    expect(isUsOnlyHost("eu-db.upstash.io")).toBe(false);
    expect(isUsOnlyHost("eu-resource")).toBe(false);
  });

  it("matches denylisted values case- and whitespace-insensitively", () => {
    mockDenylistedHashes();

    expect(isUsOnlyHost("us-only-azure")).toBe(true);
    expect(isUsOnlyHost("  US-ONLY-REDIS.example.com ")).toBe(true);
    expect(isUsOnlyHost("us-only-partition.example.com")).toBe(true);
    expect(isUsOnlyHost("eu-resource")).toBe(false);
  });
});

describe("isAzureFoundryEndpoint", () => {
  it.each<[string | undefined, boolean]>([
    ["https://eu-resource.services.ai.azure.com/providers/cohere", true],
    ["http://eu-resource.services.ai.azure.com/providers/cohere", false],
    ["https://services.ai.azure.com.example.com", false],
    ["https://api.cohere.com", false],
    ["not a url", false],
    [undefined, false],
  ])("%s is %s", (value, expected) => {
    expect(isAzureFoundryEndpoint(value)).toBe(expected);
  });
});

describe("getEuEngineConfigIssues", () => {
  it("accepts a valid EU engine config", () => {
    expect(getEuEngineConfigIssues(EU_ENGINE_ENV)).toEqual([]);
  });

  it.each([
    [undefined, "DEFAULT_COHERE_BASE_URL is required in the EU region"],
    ["not a url", "DEFAULT_COHERE_BASE_URL must be a valid URL"],
    [
      "https://api.cohere.com",
      "DEFAULT_COHERE_BASE_URL must be an https://*.services.ai.azure.com endpoint",
    ],
    [
      "http://eu-resource.services.ai.azure.com/providers/cohere",
      "DEFAULT_COHERE_BASE_URL must be an https://*.services.ai.azure.com endpoint",
    ],
  ])("checks DEFAULT_COHERE_BASE_URL=%s", (value, issue) => {
    expect(
      getEuEngineConfigIssues({
        ...EU_ENGINE_ENV,
        DEFAULT_COHERE_BASE_URL: value,
      }),
    ).toEqual([issue]);
  });

  it.each([
    "DEFAULT_PINECONE_API_KEY",
    "DEFAULT_PINECONE_HOST",
    "SECONDARY_PINECONE_API_KEY",
    "SECONDARY_PINECONE_HOST",
    "DEFAULT_TURBOPUFFER_API_KEY",
    "DEFAULT_ZEROENTROPY_API_KEY",
    "TURBOPUFFER_BASE_URL",
    "TURBOPUFFER_REGION",
    "ZEROENTROPY_BASE_URL",
    "CO_API_KEY",
    "AZURE_RESOURCE_NAME",
    "AZURE_API_KEY",
  ])("requires %s to be unset, without echoing its value", (name) => {
    const issues = getEuEngineConfigIssues({
      ...EU_ENGINE_ENV,
      [name]: "secret-value-123",
    });

    expect(issues).toEqual([`${name} must not be set in the EU region`]);
    expect(issues.join()).not.toContain("secret-value-123");
  });

  it("treats empty values as unset", () => {
    expect(
      getEuEngineConfigIssues({ ...EU_ENGINE_ENV, CO_API_KEY: "" }),
    ).toEqual([]);
  });

  it("rejects the US Azure resource and partition API host", () => {
    mockDenylistedHashes();

    expect(
      getEuEngineConfigIssues({
        ...EU_ENGINE_ENV,
        DEFAULT_AZURE_RESOURCE_NAME: "us-only-azure",
        PARTITION_API_URL: "https://us-only-partition.example.com",
      }),
    ).toEqual([
      "PARTITION_API_URL points to a US-only host",
      "DEFAULT_AZURE_RESOURCE_NAME points to a US-only resource",
    ]);
  });
});

describe("getEuStorageConfigIssues", () => {
  it.each([
    ["https://abc123.eu.r2.cloudflarestorage.com", []],
    [
      "https://abc123.r2.cloudflarestorage.com",
      [
        "S3_ENDPOINT must be an EU jurisdiction R2 endpoint (*.eu.r2.cloudflarestorage.com)",
      ],
    ],
    [
      "https://abc123.eu.r2.cloudflarestorage.com.example.com",
      [
        "S3_ENDPOINT must be an EU jurisdiction R2 endpoint (*.eu.r2.cloudflarestorage.com)",
      ],
    ],
    [undefined, ["S3_ENDPOINT is required in the EU region"]],
  ])("checks S3_ENDPOINT=%s", (value, issues) => {
    expect(getEuStorageConfigIssues({ S3_ENDPOINT: value })).toEqual(issues);
  });
});

describe("getEuDatabaseConfigIssues", () => {
  it.each([
    "postgresql://u:p@aws-0-eu-central-1.pooler.supabase.com:6543/postgres",
    "postgresql://u:p@aws-1-eu-west-2.pooler.supabase.com:5432/postgres",
    "postgresql://u:p@db.eu-north-1.rds.amazonaws.com:5432/postgres",
    "postgresql://u:p@eu-south-1.example.com/postgres",
  ])("accepts EU host %s", (url) => {
    expect(getEuDatabaseConfigIssues({ DATABASE_URL: url })).toEqual([]);
  });

  it.each([
    "postgresql://u:p@db.us-west-1.example.com:6543/postgres",
    "postgresql://u:p@localhost:5432/postgres",
    "postgresql://u:p@neu-central-1.example.com/postgres",
  ])("rejects non-EU host %s without echoing it", (url) => {
    const issues = getEuDatabaseConfigIssues({ DATABASE_URL: url });

    expect(issues).toEqual(["DATABASE_URL must point to an EU database host"]);
    expect(issues.join()).not.toContain("u:p@");
  });

  it.each([
    "sslmode=require",
    "sslrootcert=ca.pem",
    "sslcert=c",
    "sslkey=k",
    "ssl=true",
    "ssl=0",
  ])("rejects a URL that sets %s", (param) => {
    const issues = getEuDatabaseConfigIssues({
      DATABASE_URL: `postgresql://u:p@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&${param}`,
    });

    expect(issues).toEqual([
      `DATABASE_URL must not set ${param.split("=")[0]} in the EU region (TLS is configured in code)`,
    ]);
    expect(issues.join()).not.toContain("u:p@");
  });
});

describe("getEuRedisConfigIssues", () => {
  it("rejects the US Redis host", () => {
    mockDenylistedHashes();

    expect(
      getEuRedisConfigIssues({
        REDIS_URL: "https://us-only-redis.example.com",
      }),
    ).toEqual(["REDIS_URL points to a US-only host"]);
    expect(
      getEuRedisConfigIssues({ REDIS_URL: "https://eu-db.upstash.io" }),
    ).toEqual([]);
  });
});

describe("getEuWebConfigIssues", () => {
  it("accepts a valid EU web config", () => {
    expect(getEuWebConfigIssues(EU_WEB_ENV)).toEqual([]);
  });

  it.each([
    "NEXT_PUBLIC_APP_HOSTNAME",
    "NEXT_PUBLIC_API_HOSTNAME",
    "NEXT_PUBLIC_HOSTING_CNAME",
    "APP_DOMAIN",
  ])("requires %s", (name) => {
    expect(getEuWebConfigIssues({ ...EU_WEB_ENV, [name]: undefined })).toEqual([
      `${name} is required in the EU region`,
    ]);
  });

  it.each([
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "NEXT_PUBLIC_POSTHOG_KEY",
    "TINYBIRD_API_KEY",
    "TINYBIRD_API_URL",
  ])("requires %s to be unset", (name) => {
    expect(getEuWebConfigIssues({ ...EU_WEB_ENV, [name]: "value" })).toEqual([
      `${name} must not be set in the EU region`,
    ]);
  });

  it("requires NEXT_PUBLIC_VERCEL_ENV on Vercel", () => {
    expect(getEuWebConfigIssues({ ...EU_WEB_ENV, VERCEL: "1" })).toEqual([
      "NEXT_PUBLIC_VERCEL_ENV is required in the EU region on Vercel",
    ]);
    expect(
      getEuWebConfigIssues({
        ...EU_WEB_ENV,
        VERCEL: "1",
        NEXT_PUBLIC_VERCEL_ENV: "production",
      }),
    ).toEqual([]);
  });

  it("requires BETTER_AUTH_URL and APP_DOMAIN to use the app hostname", () => {
    expect(
      getEuWebConfigIssues({
        ...EU_WEB_ENV,
        BETTER_AUTH_URL: "https://app.agentset.ai",
        APP_DOMAIN: "https://app.agentset.ai",
      }),
    ).toEqual([
      "BETTER_AUTH_URL must use the NEXT_PUBLIC_APP_HOSTNAME host",
      "APP_DOMAIN must use the NEXT_PUBLIC_APP_HOSTNAME host",
    ]);
  });

  it("checks the database and Redis hosts", () => {
    mockDenylistedHashes();

    expect(
      getEuWebConfigIssues({
        ...EU_WEB_ENV,
        DATABASE_URL: "postgresql://u:p@localhost:5432/postgres",
        REDIS_URL: "https://us-only-redis.example.com",
      }),
    ).toEqual([
      "DATABASE_URL must point to an EU database host",
      "REDIS_URL points to a US-only host",
    ]);
  });
});

describe("enforceEuConfig", () => {
  const importGuard = async (region: string | undefined) => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);
    return import("@agentset/utils/region-guard");
  };

  it("never runs the checks on us", async () => {
    const guard = await importGuard(undefined);
    const getIssues = vi.fn(() => ["X must not be set in the EU region"]);

    expect(() => guard.enforceEuConfig(getIssues)).not.toThrow();
    expect(getIssues).not.toHaveBeenCalled();
  });

  it("throws on eu with every issue listed", async () => {
    const guard = await importGuard("eu");

    expect(() =>
      guard.enforceEuConfig(() => [
        "A is required in the EU region",
        "B must not be set in the EU region",
      ]),
    ).toThrow(
      "Invalid EU region configuration:\n  - A is required in the EU region\n  - B must not be set in the EU region",
    );
  });

  it("passes on eu when there are no issues", async () => {
    const guard = await importGuard("eu");

    expect(() => guard.enforceEuConfig(() => [])).not.toThrow();
  });
});
