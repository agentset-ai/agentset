import * as React from "react";
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
  vi.unstubAllGlobals();
  vi.stubGlobal("React", React);
  vi.doUnmock("@calcom/embed-react");
  vi.doUnmock("browser-image-compression");
  vi.doUnmock("radix-ui");
});

describe("model selector logo", () => {
  const renderLogo = async (region: Region, provider: string) => {
    withRegion(region);
    const { ModelSelectorLogo } =
      await import("@agentset/ui/ai/model-selector");
    return renderToStaticMarkup(
      React.createElement(ModelSelectorLogo, { provider }),
    );
  };

  it("loads the models.dev logo on us", async () => {
    const html = await renderLogo("us", "openai");

    expect(html).toContain('src="https://models.dev/logos/openai.svg"');
    expect(html).toContain('alt="openai logo"');
  });

  it.each(["openai", "some-provider"])(
    "renders a local %s logo on eu",
    async (provider) => {
      const html = await renderLogo("eu", provider);

      expect(html).toMatch(/^<svg/);
      expect(html).toContain(`aria-label="${provider} logo"`);
      expect(html).not.toContain("https://");
    },
  );
});

describe("entity avatar", () => {
  // Radix renders images only once loaded; plain elements show what is requested
  const loadEntityAvatar = async (region: Region) => {
    withRegion(region);
    const element =
      (tag: string, slot: string) => (props: Record<string, unknown>) =>
        React.createElement(tag, { ...props, "data-primitive": slot });
    vi.doMock("radix-ui", () => ({
      Avatar: {
        Root: element("span", "root"),
        Image: element("img", "image"),
        Fallback: element("span", "fallback"),
      },
    }));

    return (await import("@agentset/ui/avatar")).EntityAvatar;
  };

  const renderAvatar = async (region: Region, id = "org_123") => {
    const EntityAvatar = await loadEntityAvatar(region);
    return renderToStaticMarkup(
      React.createElement(EntityAvatar, { entity: { id } }),
    );
  };

  it("keeps the generated avatar on us", async () => {
    const html = await renderAvatar("us");

    expect(html).toContain(
      'src="https://api.dicebear.com/9.x/glass/svg?seed=org_123"',
    );
    expect(html).not.toContain("linear-gradient");
  });

  it("renders a local placeholder on eu", async () => {
    const html = await renderAvatar("eu");

    expect(html).toContain('data-primitive="fallback"');
    expect(html).toContain("linear-gradient");
    expect(html).not.toContain("https://");
  });

  it("derives the eu placeholder from the entity id", async () => {
    const EntityAvatar = await loadEntityAvatar("eu");
    const render = (id: string) =>
      renderToStaticMarkup(
        React.createElement(EntityAvatar, { entity: { id } }),
      );

    expect(render("org_123")).toBe(render("org_123"));
    expect(render("org_123")).not.toBe(render("org_456"));
  });

  const GITHUB_IMAGE = "https://avatars.githubusercontent.com/u/1?v=4";
  const ASSETS_LOGO = "https://assets.eu.example.com/logos/org_1.png";

  const renderEntity = async (
    region: Region,
    entity: { id: string; name?: string; image?: string; logo?: string },
  ) => {
    vi.stubEnv("NEXT_PUBLIC_ASSETS_HOSTNAME", "assets.eu.example.com");
    const EntityAvatar = await loadEntityAvatar(region);
    return renderToStaticMarkup(React.createElement(EntityAvatar, { entity }));
  };

  it.each([GITHUB_IMAGE, ASSETS_LOGO])("loads %s on us", async (image) => {
    const html = await renderEntity("us", { id: "u_1", name: "Ada L", image });

    expect(html).toContain(`src="${image.replace("&", "&amp;")}"`);
    expect(html).toContain(">AL<");
  });

  it("renders initials instead of a third-party image on eu", async () => {
    const html = await renderEntity("eu", {
      id: "u_1",
      name: "Ada L",
      image: GITHUB_IMAGE,
    });

    expect(html).not.toContain("<img");
    expect(html).not.toContain("githubusercontent");
    expect(html).toContain(">AL<");
  });

  it("renders the placeholder instead of an external logo on eu", async () => {
    const html = await renderEntity("eu", {
      id: "org_1",
      logo: "https://logos.example.com/acme.png",
    });

    expect(html).not.toContain("<img");
    expect(html).toContain("linear-gradient");
  });

  it("loads logos from the assets host on eu", async () => {
    const html = await renderEntity("eu", {
      id: "org_1",
      name: "Acme",
      logo: ASSETS_LOGO,
    });

    expect(html).toContain(`src="${ASSETS_LOGO}"`);
  });
});

describe("image uploader default image", () => {
  const GITHUB_IMAGE = "https://avatars.githubusercontent.com/u/1";

  const renderUploader = async (region: Region) => {
    withRegion(region);
    vi.stubEnv("NEXT_PUBLIC_ASSETS_HOSTNAME", "assets.eu.example.com");
    const { ImageUploader } = await import("@agentset/ui/image-uploader");

    return renderToStaticMarkup(
      React.createElement(ImageUploader, { defaultImageUrl: GITHUB_IMAGE }),
    );
  };

  it("shows the current image on us", async () => {
    expect(await renderUploader("us")).toContain(`src="${GITHUB_IMAGE}"`);
  });

  it("doesn't load a third-party current image on eu", async () => {
    expect(await renderUploader("eu")).not.toContain("githubusercontent");
  });
});

describe("image compression", () => {
  it.each([
    ["us", true],
    ["eu", false],
  ] as const)("sets useWebWorker on %s to %s", async (region, useWebWorker) => {
    withRegion(region);
    const compress = vi.fn((file: File) => Promise.resolve(file));
    vi.doMock("browser-image-compression", () => ({ default: compress }));

    const { compressImageIfNeeded } =
      await import("@agentset/ui/image-uploader");
    const file = new File([new Uint8Array(2048)], "image.png");
    await compressImageIfNeeded(file, 1024);

    expect(compress).toHaveBeenCalledWith(
      file,
      expect.objectContaining({ useWebWorker }),
    );
  });
});

describe("Cal.com booking", () => {
  const loadCal = async (region: Region) => {
    withRegion(region);
    const getCalApi = vi.fn(() => Promise.resolve(vi.fn()));
    vi.doMock("@calcom/embed-react", () => ({ getCalApi }));

    return {
      getCalApi,
      cal: await import("@/lib/cal"),
      useCal: (await import("@/hooks/use-cal")).useCal,
    };
  };

  const renderBookButton = (useCal: () => { buttonProps: object }) =>
    renderToStaticMarkup(
      React.createElement(() =>
        React.createElement("button", useCal().buttonProps, "Book a call"),
      ),
    );

  it("uses the embed on us", async () => {
    const { getCalApi, cal, useCal } = await loadCal("us");

    await cal.getCal();

    expect(getCalApi).toHaveBeenCalledWith({ namespace: "demo" });
    expect(renderBookButton(useCal)).toBe(
      '<button data-cal-namespace="demo" data-cal-link="agentset/demo" data-cal-config="{&quot;layout&quot;:&quot;month_view&quot;}">Book a call</button>',
    );
  });

  it("links out on eu without loading the embed", async () => {
    const { getCalApi, cal, useCal } = await loadCal("eu");
    const open = vi.fn();
    vi.stubGlobal("window", { open });

    expect(await cal.getCal()).toBeUndefined();
    expect(getCalApi).not.toHaveBeenCalled();
    expect(renderBookButton(useCal)).toBe("<button>Book a call</button>");

    let buttonProps: { onClick?: () => void } = {};
    renderToStaticMarkup(
      React.createElement(() => {
        buttonProps = useCal().buttonProps;
        return null;
      }),
    );
    buttonProps.onClick?.();

    expect(open).toHaveBeenCalledWith(
      "https://cal.com/agentset/demo",
      "_blank",
      "noopener,noreferrer",
    );
  });
});
