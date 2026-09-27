import { afterEach, describe, expect, it, vi } from "vitest";

const loadProviders = async (region: "us" | "eu") => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);
  return import("@/lib/auth-providers");
};

afterEach(() => {
  vi.unstubAllEnvs();
});

const github = { GITHUB_CLIENT_ID: "gh-id", GITHUB_CLIENT_SECRET: "gh-secret" };
const google = {
  GOOGLE_CLIENT_ID: "google-id",
  GOOGLE_CLIENT_SECRET: "google-secret",
};

describe("social sign-in providers", () => {
  it("registers GitHub and Google on us", async () => {
    const { getSocialProviders, getTrustedProviders } =
      await loadProviders("us");

    const providers = getSocialProviders({ ...github, ...google });

    expect(providers).toEqual({
      github: { clientId: "gh-id", clientSecret: "gh-secret" },
      google: { clientId: "google-id", clientSecret: "google-secret" },
    });
    expect(Object.keys(providers)).toEqual(["github", "google"]);
    expect(getTrustedProviders(providers)).toEqual(["google", "github"]);
  });

  it.each([
    ["client id", { GOOGLE_CLIENT_SECRET: "google-secret" }],
    ["client secret", { GOOGLE_CLIENT_ID: "google-id" }],
    ["both", {}],
  ])(
    "leaves Google out on us when the %s is missing",
    async (_label, googleEnv) => {
      const { getSocialProviders, getTrustedProviders } =
        await loadProviders("us");

      const providers = getSocialProviders({ ...github, ...googleEnv });

      expect(Object.keys(providers)).toEqual(["github"]);
      expect(getTrustedProviders(providers)).toEqual(["github"]);
    },
  );

  it("never registers Google on eu", async () => {
    const { getSocialProviders, getTrustedProviders } =
      await loadProviders("eu");

    const providers = getSocialProviders({ ...github, ...google });

    expect(providers).toEqual({
      github: { clientId: "gh-id", clientSecret: "gh-secret" },
    });
    expect("google" in providers).toBe(false);
    expect(getTrustedProviders(providers)).toEqual(["github"]);
  });
});
