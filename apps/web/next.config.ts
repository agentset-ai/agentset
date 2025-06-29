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
    "@agentset/validation",
    "@agentset/ui",
  ],

  /** We already do linting and typechecking as separate tasks in CI */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default config;
