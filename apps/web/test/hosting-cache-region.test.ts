import type { NextFetchEvent } from "next/server";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

type Region = "us" | "eu";

const SECRET = "internal-secret";

const FULL_HOSTING = {
  id: "hosting_1",
  slug: "docs",
  protected: true,
  allowedEmailDomains: ["allowed.com"],
  allowedEmails: ["someone@example.com"],
  namespaceId: "ns_1",
};

const ROUTING_FIELDS = {
  id: "hosting_1",
  slug: "docs",
  protected: true,
  namespaceId: "ns_1",
};

const mockEnv = (region: Region) => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);
  vi.doMock("@/env", () => ({
    env: {
      NEXT_PUBLIC_APP_NAME: "Agentset",
      NEXT_PUBLIC_APP_SHORT_DOMAIN: "agentset.ai",
      NEXT_PUBLIC_VERCEL_ENV: "production",
      BETTER_AUTH_SECRET: SECRET,
    },
  }));
};

const loadMiddleware = async ({
  region,
  lookup,
  email,
  isMember = false,
  hasAccess = false,
}: {
  region: Region;
  lookup: object;
  email: string;
  isMember?: boolean;
  hasAccess?: boolean;
}) => {
  mockEnv(region);

  const cache = {
    get: vi.fn(() => Promise.resolve(undefined)),
    set: vi.fn(() => Promise.resolve()),
  };
  vi.doMock("@vercel/functions", () => ({ getCache: () => cache }));
  vi.doMock("better-auth/cookies", () => ({
    getSessionCookie: () => "session-cookie",
  }));
  vi.doMock("@/lib/middleware/get-session", () => ({
    getMiddlewareSession: () =>
      Promise.resolve({ user: { id: "user_1", email } }),
  }));

  const fetchMock = vi.fn((url: string) => {
    const { pathname } = new URL(url);
    if (pathname === "/api/middleware/hosting") {
      return Promise.resolve(Response.json({ hosting: lookup }));
    }
    if (pathname === "/api/middleware/hosting/member") {
      return Promise.resolve(Response.json({ isMember }));
    }
    if (pathname === "/api/middleware/hosting/access") {
      return Promise.resolve(Response.json({ hasAccess }));
    }
    return Promise.resolve(new Response(null, { status: 404 }));
  });
  vi.stubGlobal("fetch", fetchMock);

  const { default: HostingMiddleware } =
    await import("@/lib/middleware/hosting");

  const run = async () => {
    const waitUntil = vi.fn();
    const res = await HostingMiddleware(
      new NextRequest("https://docs.example.com/chat", {
        headers: { host: "docs.example.com" },
      }),
      { waitUntil } as unknown as NextFetchEvent,
    );
    await Promise.all(waitUntil.mock.calls.map(([p]) => p as Promise<unknown>));
    return res;
  };

  const paths = () =>
    fetchMock.mock.calls.map(([url]) => new URL(url).pathname);

  return { run, cache, fetchMock, paths };
};

const rewriteOf = (res: Response) => res.headers.get("x-middleware-rewrite");

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  for (const path of [
    "@/env",
    "@vercel/functions",
    "better-auth/cookies",
    "@/lib/middleware/get-session",
    "@agentset/db/client",
  ]) {
    vi.doUnmock(path);
  }
});

describe("hosting middleware on us", () => {
  it("keeps the us lookup and access checks", async () => {
    const { run, cache, paths } = await loadMiddleware({
      region: "us",
      lookup: FULL_HOSTING,
      email: "someone@example.com",
    });

    const res = await run();

    expect(cache.set).toHaveBeenCalledWith(
      "domain:docs.example.com",
      FULL_HOSTING,
      {
        ttl: 3600,
        tags: ["hosting:hosting_1"],
      },
    );
    expect(rewriteOf(res)).toBe("https://docs.example.com/hosting_1/chat");
    expect(paths()).toEqual(["/api/middleware/hosting"]);
  });

  it.each<[string, string, boolean, string]>([
    ["an allowed domain", "user@allowed.com", false, "/hosting_1/chat"],
    ["a member", "user@other.com", true, "/hosting_1/chat"],
    ["anyone else", "user@other.com", false, "/hosting_1/not-allowed"],
  ])("routes %s as today", async (_label, email, isMember, path) => {
    const { run, paths } = await loadMiddleware({
      region: "us",
      lookup: FULL_HOSTING,
      email,
      isMember,
    });

    const res = await run();

    expect(rewriteOf(res)).toBe(`https://docs.example.com${path}`);
    expect(paths()).not.toContain("/api/middleware/hosting/access");
  });
});

describe("hosting middleware on eu", () => {
  it("caches routing fields only", async () => {
    // even if the lookup returned the allowed emails, they aren't cached
    const { run, cache } = await loadMiddleware({
      region: "eu",
      lookup: FULL_HOSTING,
      email: "someone@example.com",
      hasAccess: true,
    });

    await run();

    expect(cache.set).toHaveBeenCalledWith(
      "domain:docs.example.com",
      ROUTING_FIELDS,
      { ttl: 3600, tags: ["hosting:hosting_1"] },
    );
  });

  it.each<[boolean, string]>([
    [true, "/hosting_1/chat"],
    [false, "/hosting_1/not-allowed"],
  ])(
    "checks access in the internal route (access: %s)",
    async (hasAccess, path) => {
      const { run, fetchMock, paths } = await loadMiddleware({
        region: "eu",
        lookup: ROUTING_FIELDS,
        email: "someone@example.com",
        hasAccess,
      });

      const res = await run();

      expect(rewriteOf(res)).toBe(`https://docs.example.com${path}`);
      expect(paths()).toEqual([
        "/api/middleware/hosting",
        "/api/middleware/hosting/access",
      ]);
      const accessUrl = new URL(fetchMock.mock.calls[1]![0]);
      expect(Object.fromEntries(accessUrl.searchParams)).toEqual({
        hostingId: "hosting_1",
        userId: "user_1",
      });
    },
  );

  it("doesn't check access for public hostings", async () => {
    const { run, paths } = await loadMiddleware({
      region: "eu",
      lookup: { ...ROUTING_FIELDS, protected: false },
      email: "someone@example.com",
    });

    const res = await run();

    expect(rewriteOf(res)).toBe("https://docs.example.com/hosting_1/chat");
    expect(paths()).toEqual(["/api/middleware/hosting"]);
  });
});

const internalRequest = (path: string, secret = SECRET) =>
  new NextRequest(`https://eu.agentset.ai${path}`, {
    headers: { "x-agentset-middleware-secret": secret },
  });

describe("hosting lookup route", () => {
  it.each<[Region, boolean]>([
    ["us", true],
    ["eu", false],
  ])("selects the allowed emails on %s: %s", async (region, selected) => {
    mockEnv(region);
    const findFirst = vi.fn(() => Promise.resolve(null));
    vi.doMock("@agentset/db/client", () => ({
      db: { hosting: { findFirst } },
    }));

    const { GET } =
      await import("@/app/api/(internal-api)/middleware/hosting/route");
    await GET(internalRequest("/api/middleware/hosting?mode=slug&value=docs"));

    expect(findFirst).toHaveBeenCalledWith({
      where: { slug: "docs" },
      select: {
        id: true,
        slug: true,
        protected: true,
        allowedEmailDomains: selected,
        allowedEmails: selected,
        namespaceId: true,
      },
    });
  });
});

describe("hosting access route", () => {
  const loadAccessRoute = async ({
    email = "user@other.com",
    member = false,
    hosting = {
      allowedEmailDomains: ["allowed.com"],
      allowedEmails: ["someone@example.com"],
      namespaceId: "ns_1",
    } as object | null,
  }: {
    email?: string;
    member?: boolean;
    hosting?: object | null;
  } = {}) => {
    mockEnv("eu");
    const memberFindFirst = vi.fn(() =>
      Promise.resolve(member ? { id: "member_1" } : null),
    );
    vi.doMock("@agentset/db/client", () => ({
      db: {
        hosting: { findUnique: vi.fn(() => Promise.resolve(hosting)) },
        user: { findUnique: vi.fn(() => Promise.resolve({ email })) },
        member: { findFirst: memberFindFirst },
      },
    }));

    const { GET } =
      await import("@/app/api/(internal-api)/middleware/hosting/access/route");
    const call = async (secret?: string) => {
      const res = await GET(
        internalRequest(
          "/api/middleware/hosting/access?hostingId=hosting_1&userId=user_1",
          secret,
        ),
      );
      return { status: res.status, body: (await res.json()) as object };
    };

    return { call, memberFindFirst };
  };

  it("rejects requests without the internal secret", async () => {
    const { call } = await loadAccessRoute();

    expect((await call("wrong-secret-val")).status).toBe(401);
  });

  it.each<[string, { email?: string; member?: boolean }, boolean]>([
    ["an allowed email", { email: "someone@example.com" }, true],
    ["an allowed email domain", { email: "user@allowed.com" }, true],
    ["an organization member", { member: true }, true],
    ["anyone else", {}, false],
  ])("answers for %s", async (_label, options, hasAccess) => {
    const { call } = await loadAccessRoute(options);

    expect(await call()).toEqual({ status: 200, body: { hasAccess } });
  });

  it("denies access to unknown hostings", async () => {
    const { call, memberFindFirst } = await loadAccessRoute({ hosting: null });

    expect((await call()).body).toEqual({ hasAccess: false });
    expect(memberFindFirst).not.toHaveBeenCalled();
  });
});

describe("hosting member route", () => {
  it.each<[Region, boolean]>([
    ["us", true],
    ["us", false],
    ["eu", true],
  ])("answers on %s for member=%s", async (region, member) => {
    mockEnv(region);
    const findFirst = vi.fn(() =>
      Promise.resolve(member ? { id: "member_1" } : null),
    );
    vi.doMock("@agentset/db/client", () => ({ db: { member: { findFirst } } }));

    const { GET } =
      await import("@/app/api/(internal-api)/middleware/hosting/member/route");
    const res = await GET(
      internalRequest(
        "/api/middleware/hosting/member?userId=user_1&namespaceId=ns_1",
      ),
    );

    expect(await res.json()).toEqual({ isMember: member });
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
        organization: { namespaces: { some: { id: "ns_1" } } },
      },
      select: { id: true },
    });
  });
});

describe("isAllowedHostingEmail", () => {
  it.each<[string, boolean]>([
    ["someone@example.com", true],
    ["user@allowed.com", true],
    ["user@sub.allowed.com", false],
    ["other@example.com", false],
    ["no-at-sign", false],
  ])("%s is %s", async (email, expected) => {
    const { isAllowedHostingEmail } = await import("@/lib/hosting-access");

    expect(isAllowedHostingEmail(FULL_HOSTING, email)).toBe(expected);
  });
});
