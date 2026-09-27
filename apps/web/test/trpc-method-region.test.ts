import { createTRPCClient, httpBatchStreamLink } from "@trpc/client";
import { initTRPC } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import SuperJSON from "superjson";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";

type Region = "us" | "eu";

const loadOptions = async (region: Region) => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);
  return import("@/trpc/method-override");
};

// A client and handler configured like the dashboard's, talking in memory
const createClient = async (region: Region) => {
  const { trpcHandlerMethodOptions, trpcLinkMethodOptions } =
    await loadOptions(region);

  const t = initTRPC.create({ transformer: SuperJSON });
  const router = t.router({
    search: t.procedure
      .input(z.object({ query: z.string() }))
      .query(({ input }) => ({ echo: input.query })),
  });

  const requests: { method: string; url: string }[] = [];
  const client = createTRPCClient<typeof router>({
    links: [
      httpBatchStreamLink({
        transformer: SuperJSON,
        url: "https://app.test/api/trpc",
        ...trpcLinkMethodOptions,
        fetch: async (input, init) => {
          const req = new Request(input as string, init as RequestInit);
          requests.push({ method: req.method, url: req.url });
          return fetchRequestHandler({
            endpoint: "/api/trpc",
            req,
            router,
            ...trpcHandlerMethodOptions,
          });
        },
      }),
    ],
  });

  return { client, requests };
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("tRPC query method", () => {
  it("keeps the us link and handler options", async () => {
    const { trpcHandlerMethodOptions, trpcLinkMethodOptions } =
      await loadOptions("us");

    expect(trpcLinkMethodOptions).toEqual({});
    expect(trpcHandlerMethodOptions).toEqual({});
  });

  it("sends queries as GET on us", async () => {
    const { client, requests } = await createClient("us");

    await expect(client.search.query({ query: "hello" })).resolves.toEqual({
      echo: "hello",
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]!.method).toBe("GET");
    expect(requests[0]!.url).toContain("input=");
  });

  it("sends queries as POST without input in the URL on eu", async () => {
    const { client, requests } = await createClient("eu");

    await expect(
      client.search.query({ query: "private search text" }),
    ).resolves.toEqual({ echo: "private search text" });
    expect(requests).toHaveLength(1);
    expect(requests[0]!.method).toBe("POST");
    expect(requests[0]!.url).not.toContain("input=");
    expect(decodeURIComponent(requests[0]!.url)).not.toContain("private");
  });
});
