import { afterEach, describe, expect, it, vi } from "vitest";

import { ProviderUnavailableError } from "@agentset/engine/errors";

afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@agentset/db/client");
});

describe("handleApiError", () => {
  it("returns unavailable providers as a bad request", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { handleApiError } = await import("@/lib/api/errors");

    expect(
      handleApiError(
        new ProviderUnavailableError(
          "This model isn't available in this region",
        ),
      ),
    ).toEqual({
      error: {
        code: "bad_request",
        message: "This model isn't available in this region",
        doc_url: "https://docs.agentset.ai/api-reference/errors#bad-request",
      },
      status: 400,
    });
  });

  it("keeps other errors as internal server errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { handleApiError } = await import("@/lib/api/errors");

    expect(handleApiError(new Error("boom"))).toMatchObject({
      error: { code: "internal_server_error" },
      status: 500,
    });
  });
});

describe("tRPC procedures", () => {
  const loadCaller = async (session: object | null) => {
    vi.resetModules();
    vi.doMock("@/lib/auth", () => ({ auth: {} }));
    vi.doMock("@agentset/db/client", () => ({ db: {} }));

    const {
      createCallerFactory,
      createTRPCRouter,
      protectedProcedure,
      publicProcedure,
    } = await import("@/server/api/trpc");

    const router = createTRPCRouter({
      protectedUnavailable: protectedProcedure.query(() => {
        throw new ProviderUnavailableError(
          "Managed vector stores are not available in this region",
        );
      }),
      publicUnavailable: publicProcedure.mutation(() => {
        throw new ProviderUnavailableError(
          "This reranking model isn't available in this region",
        );
      }),
      failing: protectedProcedure.query(() => {
        throw new Error("boom");
      }),
    });

    return createCallerFactory(router)({
      db: {},
      session,
      headers: new Headers(),
    } as never);
  };

  it("returns unavailable providers as a bad request", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const caller = await loadCaller({ user: { id: "user_1" } });

    await expect(caller.protectedUnavailable()).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Managed vector stores are not available in this region",
    });
    await expect(caller.publicUnavailable()).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "This reranking model isn't available in this region",
    });
  });

  it("keeps other errors unchanged", async () => {
    const caller = await loadCaller({ user: { id: "user_1" } });

    await expect(caller.failing()).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "boom",
    });
  });

  it("still rejects unauthenticated calls", async () => {
    const caller = await loadCaller(null);

    await expect(caller.protectedUnavailable()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
