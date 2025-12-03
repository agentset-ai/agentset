import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

import { env as engineEnv } from "@agentset/engine/env";
import { env as storageEnv } from "@agentset/storage/env";
import { env as stripeEnv } from "@agentset/stripe/env";

export const env = createEnv({
  extends: [engineEnv, storageEnv, stripeEnv],
  shared: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    NEXT_PUBLIC_APP_NAME: z.string().optional().default("Agentset"),
    NEXT_PUBLIC_APP_SHORT_DOMAIN: z.string().optional().default("agentset.ai"),

    NEXT_PUBLIC_VERCEL_ENV: z
      .enum(["development", "preview", "production"])
      .optional()
      .default("development"),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  },
  server: {
    DATABASE_URL: z.url(),

    RESEND_API_KEY: z.string(),

    BETTER_AUTH_SECRET: z.string(),
    BETTER_AUTH_URL: z.url(),

    GITHUB_CLIENT_ID: z.string(),
    GITHUB_CLIENT_SECRET: z.string(),

    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),

    REDIS_URL: z.url(),
    REDIS_TOKEN: z.string(),

    STRIPE_WEBHOOK_SECRET: z.string(),

    DISCORD_HOOK_ALERTS: z.url().optional(),
    DISCORD_HOOK_CRON: z.url().optional(),
    DISCORD_HOOK_SUBSCRIBERS: z.url().optional(),
    DISCORD_HOOK_ERRORS: z.url().optional(),

    TRIGGER_SECRET_KEY: z.string(),

    VERCEL_PROJECT_ID: z.string(),
    VERCEL_TEAM_ID: z.string(),
    VERCEL_API_TOKEN: z.string(),
  },
  client: {},
  runtimeEnv: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_SHORT_DOMAIN: process.env.NEXT_PUBLIC_APP_SHORT_DOMAIN,
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    RESEND_API_KEY: process.env.RESEND_API_KEY,

    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,

    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,

    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

    REDIS_URL: process.env.REDIS_URL,
    REDIS_TOKEN: process.env.REDIS_TOKEN,

    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,

    DISCORD_HOOK_ALERTS: process.env.DISCORD_HOOK_ALERTS,
    DISCORD_HOOK_CRON: process.env.DISCORD_HOOK_CRON,
    DISCORD_HOOK_SUBSCRIBERS: process.env.DISCORD_HOOK_SUBSCRIBERS,
    DISCORD_HOOK_ERRORS: process.env.DISCORD_HOOK_ERRORS,

    TRIGGER_SECRET_KEY: process.env.TRIGGER_SECRET_KEY,

    VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID,
    VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID,
    VERCEL_API_TOKEN: process.env.VERCEL_API_TOKEN,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
  emptyStringAsUndefined: true,
});
