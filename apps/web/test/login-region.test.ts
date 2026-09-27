import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

// The package sources are compiled with the classic JSX runtime here
vi.stubGlobal("React", React);

type Region = "us" | "eu";

const withRegion = (region: Region) => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("@/lib/auth-client");
  vi.doUnmock("next/navigation");
  vi.doUnmock("usehooks-ts");
});

const EU_BADGE = /data-slot="badge"[^>]*>EU</;

const renderLoginForm = async (
  region: Region,
  form: "dashboard" | "hosting",
) => {
  withRegion(region);
  vi.doMock("next/navigation", () => ({
    useSearchParams: () => new URLSearchParams(),
  }));
  vi.doMock("@/lib/auth-client", () => ({
    authClient: { signIn: {}, emailOtp: {} },
  }));
  vi.doMock("usehooks-ts", () => ({ useIsClient: () => false }));

  const { LoginForm } =
    form === "dashboard"
      ? await import("@/app/app.agentset.ai/login/login-form")
      : await import("@/app/[hostingId]/login/login-form");

  return renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      React.createElement(LoginForm),
    ),
  );
};

describe("dashboard login form", () => {
  it("offers Google sign-in and no region badge on us", async () => {
    const html = await renderLoginForm("us", "dashboard");

    expect(html).toContain("Google");
    expect(html).toContain("Github");
    expect(html).toContain('class="grid gap-4 sm:grid-cols-2"');
    expect(html).not.toContain('data-slot="badge"');
  });

  it("hides Google sign-in and shows the EU badge on eu", async () => {
    const html = await renderLoginForm("eu", "dashboard");

    expect(html).not.toContain("Google");
    expect(html).toContain("Github");
    expect(html).toContain('class="grid gap-4"');
    expect(html).toMatch(EU_BADGE);
  });
});

describe("region badge", () => {
  it.each([
    ["us", false],
    ["eu", true],
  ] as const)("on the hosted login page (%s: %s)", async (region, shown) => {
    const html = await renderLoginForm(region, "hosting");

    expect(EU_BADGE.test(html)).toBe(shown);
  });

  it.each([
    ["us", ""],
    ["eu", "EU"],
  ] as const)("renders on %s as %j", async (region, text) => {
    withRegion(region);
    const { RegionBadge } = await import("@/components/region-badge");

    const html = renderToStaticMarkup(React.createElement(RegionBadge));
    expect(html.replace(/<[^>]+>/g, "")).toBe(text);
  });
});
