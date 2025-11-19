/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const makeConfig = async (): Promise<NextConfig> => {
  const { createJiti } = await import("jiti");
  await createJiti(fileURLToPath(import.meta.url)).import("./src/env.ts");

  return {
    poweredByHeader: false,

    images: {
      remotePatterns: [
        {
          hostname: "assets.agentset.ai",
        },
      ],
    },

    /** Enables hot reloading for local packages without a build step */
    transpilePackages: [
      "@agentset/db",
      "@agentset/emails",
      "@agentset/engine",
      "@agentset/jobs",
      "@agentset/storage",
      "@agentset/stripe",
      "@agentset/ui",
      "@agentset/utils",
      "@agentset/validation",
    ],

    /** We already do linting and typechecking as separate tasks in CI */
    eslint: { ignoreDuringBuilds: true },
    typescript: { ignoreBuildErrors: true },

    async rewrites() {
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
