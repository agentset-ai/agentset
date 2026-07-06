import { env } from "@/env";
import { AgentsetApiError } from "@/lib/api/errors";

// self-hosted deployments may not have Vercel credentials configured
export const isVercelConfigured = () =>
  Boolean(env.VERCEL_PROJECT_ID && env.VERCEL_TEAM_ID && env.VERCEL_API_TOKEN);

export const assertVercelConfigured = () => {
  if (!isVercelConfigured()) {
    throw new AgentsetApiError({
      code: "unprocessable_entity",
      message:
        "Custom domains require Vercel configuration. Set the VERCEL_PROJECT_ID, VERCEL_TEAM_ID, and VERCEL_API_TOKEN environment variables.",
    });
  }
};
