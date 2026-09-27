import { afterEach, describe, expect, it, vi } from "vitest";

const loadRoute = async ({
  region,
  vercelRegion,
  dbError,
}: {
  region: "us" | "eu" | undefined;
  vercelRegion?: string;
  dbError?: Error;
}) => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);

  const log = vi.fn(() => Promise.resolve(undefined));
  const waitUntil = vi.fn();
  const executeRaw = dbError
    ? vi.fn(() => Promise.reject(dbError))
    : vi.fn(() => Promise.resolve(1));

  vi.doMock("@/env", () => ({ env: { VERCEL_REGION: vercelRegion } }));
  vi.doMock("@/lib/log", () => ({ log }));
  vi.doMock("@vercel/functions", () => ({ waitUntil }));
  vi.doMock("@agentset/db/client", () => ({ db: { $executeRaw: executeRaw } }));

  const route = await import("@/app/api/(public-api)/health/route");
  return { GET: route.GET, log, waitUntil };
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("@/env");
  vi.doUnmock("@/lib/log");
  vi.doUnmock("@vercel/functions");
  vi.doUnmock("@agentset/db/client");
});

describe("health route", () => {
  it("returns today's payload on us, even outside the EU regions", async () => {
    const { GET, log } = await loadRoute({
      region: undefined,
      vercelRegion: "iad1",
    });

    const res = await GET();
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(Object.keys(body)).toEqual(["status", "timing", "timestamp"]);
    expect(body.status).toBe("healthy");
    expect(log).not.toHaveBeenCalled();
  });

  it("keeps the us error payload unchanged", async () => {
    const { GET } = await loadRoute({
      region: "us",
      vercelRegion: "iad1",
      dbError: new Error("connection refused"),
    });

    const res = await GET();
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(500);
    expect(Object.keys(body)).toEqual([
      "status",
      "error",
      "timing",
      "timestamp",
    ]);
  });

  it.each(["fra1", "cdg1", "arn1", "dub1", undefined])(
    "reports nothing on eu in %s",
    async (vercelRegion) => {
      const { GET, log } = await loadRoute({ region: "eu", vercelRegion });

      const body = (await (await GET()).json()) as Record<string, unknown>;

      expect(body).not.toHaveProperty("regionMismatch");
      expect(log).not.toHaveBeenCalled();
    },
  );

  it("reports and alerts once when eu runs outside the EU regions", async () => {
    const { GET, log, waitUntil } = await loadRoute({
      region: "eu",
      vercelRegion: "iad1",
    });

    const first = (await (await GET()).json()) as Record<string, unknown>;
    const second = (await (await GET()).json()) as Record<string, unknown>;

    for (const body of [first, second]) {
      expect(body.status).toBe("healthy");
      expect(body.regionMismatch).toEqual({
        vercelRegion: "iad1",
        expected: ["fra1", "cdg1", "arn1", "dub1"],
      });
    }
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith({
      message:
        "Health check ran in Vercel region iad1, outside the EU regions (fra1, cdg1, arn1, dub1)",
      type: "alerts",
    });
    expect(waitUntil).toHaveBeenCalledTimes(1);
  });

  it("reports the region on eu when the database check fails", async () => {
    const { GET } = await loadRoute({
      region: "eu",
      vercelRegion: "iad1",
      dbError: new Error("timeout"),
    });

    const res = await GET();
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(500);
    expect(body.regionMismatch).toMatchObject({ vercelRegion: "iad1" });
  });
});
