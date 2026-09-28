/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const parseAssetsHostname = () => {
  const assetsUrl = process.env.ASSETS_S3_URL;
  return assetsUrl && URL.canParse(assetsUrl)
    ? new URL(assetsUrl).hostname
    : undefined;
};

const makeConfig = async (): Promise<NextConfig> => {
  const { createJiti } = await import("jiti");
  const jiti = createJiti(fileURLToPath(import.meta.url));
  await jiti.import("./src/env.ts");
  const { isEuRegion, REGION_FEATURES } =
    await jiti.import<typeof import("@agentset/utils")>("@agentset/utils");
  const assetsHostname = parseAssetsHostname();

  return {
    poweredByHeader: false,

    images: {
      remotePatterns: [
        {
          hostname: assetsHostname ?? "assets.agentset.ai",
        },
      ],
    },

    // EU: the host dashboard images may load from (see canLoadImage)
    ...(isEuRegion &&
      assetsHostname && {
        env: { NEXT_PUBLIC_ASSETS_HOSTNAME: assetsHostname },
      }),

    /** Enables hot reloading for local packages without a build step */
    transpilePackages: [
      "@agentset/db",
      "@agentset/demo",
      "@agentset/emails",
      "@agentset/engine",
      "@agentset/jobs",
      "@agentset/storage",
      "@agentset/stripe",
      "@agentset/ui",
      "@agentset/utils",
      "@agentset/validation",
      "@agentset/webhooks",
      "@agentset/tinybird",
    ],

    /** We already do linting and typechecking as separate tasks in CI */
    typescript: { ignoreBuildErrors: true },

    async rewrites() {
      if (!REGION_FEATURES.productAnalytics) return [];

      return [
        // for posthog proxy
        {
          source: "/_proxy/posthog/ingest/static/:path*",
          destination: "https://us-assets.i.posthog.com/static/:path*",
        },
        {
          source: "/_proxy/posthog/ingest/:path*",
          destination: "https://us.i.posthog.com/:path*",
        },
      ];
    },
  };
};

export default makeConfig();
