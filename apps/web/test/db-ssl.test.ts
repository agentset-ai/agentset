import { X509Certificate } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

const SUPABASE_URLS = [
  "postgresql://user:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
  "postgresql://user:password@db.projectref.supabase.co:5432/postgres",
];
const OTHER_URLS = [
  "postgresql://postgres:password@localhost:5432/agentset",
  "postgresql://user:password@db.example.com:5432/postgres",
  "postgresql://user:password@supabase.com.example.com:5432/postgres",
];

const importSsl = async (region: string | undefined) => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);
  return import("@agentset/db/ssl");
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getDatabaseSslConfig", () => {
  it.each(OTHER_URLS)("returns undefined for %s on us", async (url) => {
    const { getDatabaseSslConfig } = await importSsl(undefined);

    expect(getDatabaseSslConfig(url)).toBeUndefined();
  });

  it("doesn't parse the connection string on us", async () => {
    const { getDatabaseSslConfig } = await importSsl("us");

    expect(getDatabaseSslConfig("not a url")).toBeUndefined();
  });

  it.each(SUPABASE_URLS)(
    "verifies %s against the pinned CA on eu",
    async (url) => {
      const { getDatabaseSslConfig } = await importSsl("eu");

      const ssl = getDatabaseSslConfig(url);

      expect(ssl).toEqual({ ca: expect.any(String) as string });
      // no rejectUnauthorized override: node verifies the chain and hostname
      expect(ssl).not.toHaveProperty("rejectUnauthorized");
    },
  );

  it.each(OTHER_URLS)("leaves %s unchanged on eu", async (url) => {
    const { getDatabaseSslConfig } = await importSsl("eu");

    expect(getDatabaseSslConfig(url)).toBeUndefined();
  });

  it("pins the Supabase Root 2021 CA", async () => {
    const { getDatabaseSslConfig } = await importSsl("eu");

    const ssl = getDatabaseSslConfig(SUPABASE_URLS[0]!);
    const cert = new X509Certificate(ssl!.ca as string);

    expect(cert.subject).toContain("CN=Supabase Root 2021 CA");
    expect(cert.fingerprint256).toBe(
      "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA",
    );
    expect(new Date(cert.validTo).toISOString().slice(0, 10)).toBe(
      "2031-04-26",
    );
  });
});
