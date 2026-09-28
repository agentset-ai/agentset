import { afterEach, describe, expect, it, vi } from "vitest";

type Region = "us" | "eu";

const loadLog = async (region: Region, env: Record<string, string> = {}) => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);
  vi.doMock("@/env", () => ({ env: { NODE_ENV: "production", ...env } }));
  return import("@/lib/log");
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.doUnmock("@/env");
});

describe("log", () => {
  it.each<[Region, string]>([
    ["us", "🚨 Something failed"],
    ["eu", "🚨 [EU] Something failed"],
  ])("posts the %s alert to Discord", async (region, content) => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null)));
    vi.stubGlobal("fetch", fetchMock);
    const { log } = await loadLog(region, {
      DISCORD_HOOK_ALERTS: "https://discord.example.com/hook",
    });

    await log({ message: "Something failed", type: "alerts" });

    expect(fetchMock).toHaveBeenCalledWith("https://discord.example.com/hook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  });

  it.each<[Region, string]>([
    ["us", "New subscriber"],
    ["eu", "[EU] New subscriber"],
  ])("prints the %s message without a hook", async (region, message) => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { log } = await loadLog(region);

    await log({ message: "New subscriber", type: "subscribers" });

    expect(consoleError).toHaveBeenCalledWith(message);
  });
});

describe("logRequestError", () => {
  it("logs the error itself on us", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { logRequestError } = await loadLog("us");
    const error = new Error("prompt text");

    logRequestError("Agentic search failed", error, { namespaceId: "ns_1" });

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(error);
  });

  it("logs the message, error type and ids only on eu", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { logRequestError } = await loadLog("eu");
    const error = Object.assign(new Error("prompt text"), {
      statusCode: 400,
      requestBodyValues: { prompt: "prompt text" },
    });

    logRequestError("Agentic search failed", error, { namespaceId: "ns_1" });

    expect(consoleError).toHaveBeenCalledWith("Agentic search failed", {
      error: { name: "Error", statusCode: 400 },
      context: { namespaceId: "ns_1" },
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "prompt text",
    );
  });
});
