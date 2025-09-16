/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import type { NextConfig } from "next";

import "./src/env";

const config: NextConfig = {
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

export default config;
