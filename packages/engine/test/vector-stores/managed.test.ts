import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { importForRegion } from "../helpers/region";

const env = vi.hoisted(() => ({
  DEFAULT_PINECONE_API_KEY: undefined as string | undefined,
  DEFAULT_PINECONE_HOST: undefined as string | undefined,
  SECONDARY_PINECONE_API_KEY: undefined as string | undefined,
  SECONDARY_PINECONE_HOST: undefined as string | undefined,
  DEFAULT_TURBOPUFFER_API_KEY: undefined as string | undefined,
}));

vi.mock("../../src/env", () => ({ env }));

const setManagedCredentials = () => {
  env.DEFAULT_PINECONE_API_KEY = "pinecone-key";
  env.DEFAULT_PINECONE_HOST = "https://default.svc.pinecone.io";
  env.SECONDARY_PINECONE_API_KEY = "secondary-pinecone-key";
  env.SECONDARY_PINECONE_HOST = "https://secondary.svc.pinecone.io";
  env.DEFAULT_TURBOPUFFER_API_KEY = "turbopuffer-key";
};

const importVectorStore = (region: "us" | "eu") =>
  importForRegion(region, async () => ({
    ...(await import("../../src/vector-store")),
    ...(await import("../../src/vector-store/pinecone")),
    ...(await import("../../src/vector-store/turbopuffer")),
    ...(await import("../../src/errors")),
  }));

const MANAGED_CONFIGS = [
  { provider: "MANAGED_PINECONE" },
  { provider: "MANAGED_PINECONE_OLD" },
  { provider: "MANAGED_TURBOPUFFER" },
  null,
] as const;

beforeEach(() => {
  for (const key of Object.keys(env) as (keyof typeof env)[]) {
    env[key] = undefined;
  }
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getNamespaceVectorStore (us)", () => {
  it.each([
    [{ provider: "MANAGED_PINECONE" }, "Pinecone"],
    [{ provider: "MANAGED_PINECONE_OLD" }, "Pinecone"],
    [{ provider: "MANAGED_TURBOPUFFER" }, "Turbopuffer"],
    [null, "Turbopuffer"],
  ] as const)("creates a managed store for %j", async (config, store) => {
    setManagedCredentials();
    const vectorStore = await importVectorStore("us");

    const result = await vectorStore.getNamespaceVectorStore({
      id: "ns_1",
      vectorStoreConfig: config,
    });

    expect(result).toBeInstanceOf(vectorStore[store]);
    expect(result.namespaceId).toBe("ns_1");
  });

  it.each(MANAGED_CONFIGS)(
    "rejects %j without managed credentials",
    async (config) => {
      const { getNamespaceVectorStore, ProviderUnavailableError } =
        await importVectorStore("us");

      await expect(
        getNamespaceVectorStore({ id: "ns_1", vectorStoreConfig: config }),
      ).rejects.toThrow(ProviderUnavailableError);
    },
  );
});

describe("getNamespaceVectorStore (eu)", () => {
  it.each(MANAGED_CONFIGS)("rejects %j", async (config) => {
    setManagedCredentials();
    const { getNamespaceVectorStore, ProviderUnavailableError } =
      await importVectorStore("eu");

    const result = getNamespaceVectorStore({
      id: "ns_1",
      vectorStoreConfig: config,
    });

    await expect(result).rejects.toThrow(ProviderUnavailableError);
    await expect(result).rejects.toThrow(
      "Managed vector stores are not available in this region",
    );
  });

  it("creates a Turbopuffer store with the customer's credentials", async () => {
    const { getNamespaceVectorStore, Turbopuffer } =
      await importVectorStore("eu");

    const result = await getNamespaceVectorStore({
      id: "ns_1",
      vectorStoreConfig: {
        provider: "TURBOPUFFER",
        apiKey: "customer-key",
        region: "aws-eu-central-1",
      },
    });

    expect(result).toBeInstanceOf(Turbopuffer);
    expect(result.namespaceId).toBe("ns_1");
  });

  it("creates a Pinecone store with the customer's credentials", async () => {
    const { getNamespaceVectorStore, Pinecone } = await importVectorStore("eu");

    const result = await getNamespaceVectorStore({
      id: "ns_1",
      vectorStoreConfig: {
        provider: "PINECONE",
        apiKey: "customer-key",
        indexHost: "https://customer.svc.pinecone.io",
      },
    });

    expect(result).toBeInstanceOf(Pinecone);
  });
});
