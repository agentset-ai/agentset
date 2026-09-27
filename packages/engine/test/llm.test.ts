import { afterEach, describe, expect, it, vi } from "vitest";

import { importForRegion } from "./helpers/region";

vi.mock("../src/env", () => ({
  env: {
    DEFAULT_AZURE_API_KEY: "test-key",
    DEFAULT_AZURE_RESOURCE_NAME: "test-resource",
  },
}));

const importLlm = (region: "us" | "eu") =>
  importForRegion(region, async () => ({
    ...(await import("../src/llm")),
    ...(await import("../src/errors")),
  }));

afterEach(() => {
  vi.unstubAllEnvs();
});

const modelId = (model: unknown) => (model as { modelId: string }).modelId;

describe("getNamespaceLanguageModel (us)", () => {
  it.each([
    ["openai:gpt-4.1", "gpt-4.1"],
    ["openai:gpt-5", "gpt-5-chat"],
    ["openai:gpt-5.1", "gpt-5.1-chat"],
    ["openai:gpt-5.2", "gpt-5.2-chat"],
    ["openai:gpt-5.5", "gpt-5.5"],
    ["openai:gpt-5-mini", "gpt-5-mini"],
    ["openai:gpt-5-nano", "gpt-5-nano"],
  ] as const)("maps %s to the %s deployment", async (llm, deployment) => {
    const { getNamespaceLanguageModel } = await importLlm("us");

    expect(modelId(getNamespaceLanguageModel(llm).model)).toBe(deployment);
  });

  it("round-trips encrypted reasoning for gpt-5.5", async () => {
    const { getNamespaceLanguageModel } = await importLlm("us");

    expect(getNamespaceLanguageModel("openai:gpt-5.5").providerOptions).toEqual(
      {
        openai: { store: false, include: ["reasoning.encrypted_content"] },
      },
    );
  });

  it.each([
    "openai:gpt-4.1",
    "openai:gpt-5",
    "openai:gpt-5-mini",
    "openai:gpt-5-nano",
  ] as const)("sets no provider options for %s", async (llm) => {
    const { getNamespaceLanguageModel } = await importLlm("us");

    expect(getNamespaceLanguageModel(llm)).not.toHaveProperty(
      "providerOptions",
    );
  });
});

describe("getNamespaceLanguageModel (eu)", () => {
  it.each([
    ["openai:gpt-5.5", "gpt-5.5"],
    ["openai:gpt-5-mini", "gpt-5-mini"],
    ["openai:gpt-5-nano", "gpt-5-nano"],
  ] as const)(
    "disables storage and round-trips encrypted reasoning for %s",
    async (llm, deployment) => {
      const { getNamespaceLanguageModel } = await importLlm("eu");
      const result = getNamespaceLanguageModel(llm);

      expect(modelId(result.model)).toBe(deployment);
      expect(result.providerOptions).toEqual({
        openai: { store: false, include: ["reasoning.encrypted_content"] },
      });
    },
  );

  it("disables storage for gpt-4.1 without requesting reasoning", async () => {
    const { getNamespaceLanguageModel } = await importLlm("eu");
    const result = getNamespaceLanguageModel("openai:gpt-4.1");

    expect(modelId(result.model)).toBe("gpt-4.1");
    expect(result.providerOptions).toStrictEqual({
      openai: { store: false },
    });
  });

  it("defaults to an available model", async () => {
    const { getNamespaceLanguageModel } = await importLlm("eu");

    expect(modelId(getNamespaceLanguageModel().model)).toBe("gpt-5.5");
  });

  it.each(["openai:gpt-5", "openai:gpt-5.1", "openai:gpt-5.2"] as const)(
    "rejects %s",
    async (llm) => {
      const { getNamespaceLanguageModel, ProviderUnavailableError } =
        await importLlm("eu");

      expect(() => getNamespaceLanguageModel(llm)).toThrow(
        ProviderUnavailableError,
      );
    },
  );
});
