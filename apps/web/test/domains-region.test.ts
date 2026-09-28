import { afterEach, describe, expect, it, vi } from "vitest";

type Region = "us" | "eu";

const ENV = {
  NODE_ENV: "development",
  VERCEL_PROJECT_ID: "prj_test",
  VERCEL_TEAM_ID: "team_test",
  VERCEL_API_TOKEN: "token",
};

const mockCommon = (region: Region, domainExists = false) => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);
  vi.doMock("@/env", () => ({ env: ENV }));

  const db = {
    domain: {
      findFirst: vi.fn(() =>
        Promise.resolve(domainExists ? { slug: "taken" } : null),
      ),
      findUnique: vi.fn(() => Promise.resolve(null)),
      create: vi.fn(({ data }: { data: object }) =>
        Promise.resolve({ id: "dom_1", ...data }),
      ),
    },
    hosting: {
      findFirst: vi.fn(() => Promise.resolve({ id: "hosting_1" })),
    },
  };
  vi.doMock("@agentset/db/client", () => ({ db }));

  return db;
};

const loadValidateDomain = async (region: Region) => {
  mockCommon(region);
  return (await import("@/lib/domains/utils")).validateDomain;
};

const loadRouter = async ({
  region,
  addError,
  onProject,
}: {
  region: Region;
  addError?: { code: string; message: string };
  onProject?: boolean;
}) => {
  const db = mockCommon(region);
  const addDomainToVercel = vi.fn(() =>
    Promise.resolve(addError ? { error: addError } : {}),
  );
  const isDomainOnProject = vi.fn(() => Promise.resolve(!!onProject));

  vi.doMock("@/lib/auth", () => ({ auth: {} }));
  vi.doMock("@/lib/domains/add-domain", () => ({ addDomainToVercel }));
  vi.doMock("@/lib/domains/get-domain-response", () => ({
    getDomainResponse: vi.fn(),
    isDomainOnProject,
  }));

  const { domainsRouter } = await import("@/server/api/routers/domains");
  const { createCallerFactory } = await import("@/server/api/trpc");
  const caller = createCallerFactory(domainsRouter)({
    db,
    session: { user: { id: "user_1" } },
    headers: new Headers(),
  } as never);

  return { caller, db, isDomainOnProject };
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  for (const path of [
    "@/env",
    "@agentset/db/client",
    "@/lib/auth",
    "@/lib/domains/add-domain",
    "@/lib/domains/get-domain-response",
  ]) {
    vi.doUnmock(path);
  }
});

describe("validateDomain", () => {
  it("applies no EU domain rules on us", async () => {
    const validateDomain = await loadValidateDomain("us");

    expect(await validateDomain("docs.example.com")).toEqual({ error: null });
  });

  it.each([
    "agentset.ai",
    "docs.agentset.ai",
    "a.b.agentset.ai",
    "EU.AGENTSET.AI",
  ])("rejects %s on eu", async (domain) => {
    const validateDomain = await loadValidateDomain("eu");

    expect(await validateDomain(domain)).toEqual({
      error: "agentset.ai domains can't be used as custom domains.",
      code: "unprocessable_entity",
    });
  });

  it.each(["docs.example.com", "agentset.ai.example.com", "myagentset.ai"])(
    "accepts %s on eu",
    async (domain) => {
      const validateDomain = await loadValidateDomain("eu");

      expect(await validateDomain(domain)).toEqual({ error: null });
    },
  );
});

describe("isDomainOnProject", () => {
  it.each<[string, object, boolean]>([
    ["on this project", { name: "docs.example.com", verified: true }, true],
    [
      "not on this project",
      { error: { code: "not_found", message: "Not found" } },
      false,
    ],
  ])("is %s", async (_label, response, expected) => {
    mockCommon("eu");
    const fetchMock = vi.fn(() => Promise.resolve(Response.json(response)));
    vi.stubGlobal("fetch", fetchMock);

    const { isDomainOnProject } =
      await import("@/lib/domains/get-domain-response");

    expect(await isDomainOnProject("Docs.Example.com")).toBe(expected);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.vercel.com/v9/projects/prj_test/domains/docs.example.com?teamId=team_test",
      expect.objectContaining({ method: "GET" }),
    );
  });
});

describe("domains.add", () => {
  const inUse = { code: "domain_already_in_use", message: "In use" };

  it("adds the domain on us without a project lookup", async () => {
    const { caller, db, isDomainOnProject } = await loadRouter({
      region: "us",
    });

    await caller.add({ namespaceId: "ns_1", domain: "docs.example.com" });

    expect(isDomainOnProject).not.toHaveBeenCalled();
    expect(db.domain.create).toHaveBeenCalledWith({
      data: { hostingId: "hosting_1", slug: "docs.example.com" },
    });
  });

  it("accepts a domain in use on eu when it's on this project", async () => {
    const { caller, db, isDomainOnProject } = await loadRouter({
      region: "eu",
      addError: inUse,
      onProject: true,
    });

    await caller.add({ namespaceId: "ns_1", domain: "docs.example.com" });

    expect(isDomainOnProject).toHaveBeenCalledWith("docs.example.com");
    expect(db.domain.create).toHaveBeenCalled();
  });

  it("rejects a domain in use elsewhere on eu with a conflict", async () => {
    const { caller, db } = await loadRouter({
      region: "eu",
      addError: inUse,
      onProject: false,
    });

    await expect(
      caller.add({ namespaceId: "ns_1", domain: "docs.example.com" }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "Domain is already in use.",
    });
    expect(db.domain.create).not.toHaveBeenCalled();
  });

  it("adds new domains on eu without checking the project", async () => {
    const { caller, db, isDomainOnProject } = await loadRouter({
      region: "eu",
    });

    await caller.add({ namespaceId: "ns_1", domain: "docs.example.com" });

    expect(isDomainOnProject).not.toHaveBeenCalled();
    expect(db.domain.create).toHaveBeenCalled();
  });

  it("rejects agentset.ai subdomains on eu before calling Vercel", async () => {
    const { caller, db } = await loadRouter({ region: "eu" });

    await expect(
      caller.add({ namespaceId: "ns_1", domain: "docs.agentset.ai" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.domain.create).not.toHaveBeenCalled();
  });
});
